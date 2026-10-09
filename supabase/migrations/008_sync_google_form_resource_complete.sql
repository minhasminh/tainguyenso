-- ==============================================================================
-- Migration 008: Comprehensive Google Form & Apps Script to Supabase Sync Pipeline
-- Trường TH&THCS Nguyễn Đình Anh
-- ==============================================================================

-- 1. BẢO ĐẢM CỘT teacher_id VÀ owner_id ĐƯỢC ĐỒNG BỘ TUYỆT ĐỐI
ALTER TABLE IF EXISTS public.resources
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'google_form', 'google_drive', 'api')),
  ADD COLUMN IF NOT EXISTS google_form_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Cập nhật dữ liệu cũ: đảm bảo teacher_id = owner_id
UPDATE public.resources
SET teacher_id = owner_id
WHERE teacher_id IS NULL AND owner_id IS NOT NULL;

-- 2. CHỈ MỤC DUY NHẤT ĐẢM BẢO TÍNH IDEMPOTENT (CHỐNG TẠO TRÙNG LẶP SUBMISSION)
CREATE UNIQUE INDEX IF NOT EXISTS uq_resources_google_form_submission_id 
  ON public.resources (google_form_submission_id) 
  WHERE google_form_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resources_teacher_id ON public.resources(teacher_id);
CREATE INDEX IF NOT EXISTS idx_resources_source_type ON public.resources(source_type);

-- 3. TRIGGER ĐỒNG BỘ 2 CHIỀU GIỮA teacher_id VÀ owner_id
CREATE OR REPLACE FUNCTION public.sync_resource_teacher_owner()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND NEW.teacher_id IS NULL THEN
    NEW.teacher_id := NEW.owner_id;
  ELSIF NEW.teacher_id IS NOT NULL AND NEW.owner_id IS NULL THEN
    NEW.owner_id := NEW.teacher_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_resource_teacher_owner ON public.resources;
CREATE TRIGGER trg_sync_resource_teacher_owner
  BEFORE INSERT OR UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_resource_teacher_owner();

-- 4. CẬP NHẬT RLS POLICIES ĐẢM BẢO "TÀI NGUYÊN CỦA TÔI" TRUY VẤN CHÍNH XÁC
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Giáo viên xem tài nguyên của chính mình hoặc đã duyệt" ON public.resources;
CREATE POLICY "Giáo viên xem tài nguyên của chính mình hoặc đã duyệt"
  ON public.resources FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR teacher_id = auth.uid()
    OR status = 'approved'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SCHOOL_ADMIN')
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'SUBJECT_LEADER'
        AND profiles.department_id = resources.department_id
      )
    )
  );

-- 5. STORED PROCEDURE ĐỒNG BỘ DỮ LIỆU TỪ GOOGLE APPS SCRIPT / EDGE FUNCTION
CREATE OR REPLACE FUNCTION public.sync_google_form_resource(
  p_payload jsonb,
  p_secret text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id text;
  v_email text;
  v_title text;
  v_desc text;
  v_url text;
  v_dept_name text;
  v_subj_name text;
  v_grade_name text;
  v_type_name text;
  v_topic text;
  v_school_year text;
  v_drive_file_id text;
  
  v_teacher_id uuid;
  v_teacher_full_name text;
  v_dept_id uuid;
  v_subj_id uuid;
  v_grade_id uuid;
  v_resource_id uuid;
  v_existing_id uuid;
  v_leader_id uuid;
BEGIN
  -- 1. Trích xuất & chuẩn hóa dữ liệu đầu vào
  v_submission_id := trim(COALESCE(p_payload->>'submission_id', ''));
  v_email := lower(trim(COALESCE(p_payload->>'teacher_email', p_payload->>'email', '')));
  v_title := trim(COALESCE(p_payload->>'title', ''));
  v_desc := trim(COALESCE(p_payload->>'description', ''));
  v_url := trim(COALESCE(p_payload->>'resource_url', ''));
  v_drive_file_id := trim(COALESCE(p_payload->>'drive_file_id', p_payload->>'google_drive_file_id', ''));
  v_dept_name := trim(COALESCE(p_payload->>'department', ''));
  v_subj_name := trim(COALESCE(p_payload->>'subject', ''));
  v_grade_name := trim(COALESCE(p_payload->>'grade', ''));
  v_type_name := trim(COALESCE(p_payload->>'resource_type', 'Kế hoạch bài dạy'));
  v_topic := trim(COALESCE(p_payload->>'topic', ''));
  v_school_year := trim(COALESCE(p_payload->>'academic_year', '2026–2027'));

  -- Tự sinh submission_id nếu chưa có
  IF v_submission_id IS NULL OR v_submission_id = '' THEN
    v_submission_id := 'gf_' || to_char(now(), 'YYYYMMDD_HH24MISS') || '_' || floor(random() * 10000)::text;
  END IF;

  -- 2. Kiểm tra tính hợp lệ của trường bắt buộc
  IF v_email IS NULL OR v_email = '' OR position('@' in v_email) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid',
      'code', 'INVALID_PAYLOAD',
      'message', 'Email giáo viên không hợp lệ hoặc để trống.'
    );
  END IF;

  IF v_title IS NULL OR v_title = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid',
      'code', 'INVALID_PAYLOAD',
      'message', 'Tên tài nguyên không được để trống.'
    );
  END IF;

  -- 3. Kiểm tra tính Idempotent (chống trùng lặp submission)
  SELECT id INTO v_existing_id 
  FROM public.resources 
  WHERE google_form_submission_id = v_submission_id 
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    INSERT INTO public.resource_sync_logs (
      submission_id, source, teacher_email, resource_title, resource_id, status, payload, error_message
    ) VALUES (
      v_submission_id, 'google_form', v_email, v_title, v_existing_id, 'duplicate', p_payload, 'Đã nhận bản ghi này trước đó (Idempotent check).'
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'duplicate',
      'message', 'Tài nguyên đã được tiếp nhận trước đó (Idempotent check).',
      'resource_id', v_existing_id,
      'submission_id', v_submission_id
    );
  END IF;

  -- 4. Xác định giáo viên từ Email đã chuẩn hóa
  SELECT id, full_name, department_id INTO v_teacher_id, v_teacher_full_name, v_dept_id
  FROM public.profiles
  WHERE lower(trim(email)) = v_email AND status = 'active'
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    INSERT INTO public.resource_sync_logs (
      submission_id, source, teacher_email, resource_title, status, payload, error_message
    ) VALUES (
      v_submission_id, 'google_form', v_email, v_title, 'invalid', p_payload, 'Không tìm thấy tài khoản giáo viên với email: ' || v_email
    );

    RETURN jsonb_build_object(
      'success', false,
      'status', 'failed',
      'code', 'TEACHER_NOT_FOUND',
      'message', 'Email giáo viên chưa được đăng ký trong hệ thống: ' || v_email
    );
  END IF;

  -- 5. Ánh xạ tổ chuyên môn, môn học, khối lớp
  IF v_dept_id IS NULL AND v_dept_name <> '' THEN
    SELECT id INTO v_dept_id FROM public.departments 
    WHERE lower(trim(name)) = lower(trim(v_dept_name)) 
       OR lower(trim(name)) = 'tổ ' || lower(trim(v_dept_name))
    LIMIT 1;
  END IF;

  IF v_subj_name <> '' THEN
    SELECT id INTO v_subj_id FROM public.subjects 
    WHERE lower(trim(name)) = lower(trim(v_subj_name)) 
       OR lower(trim(code)) = lower(trim(v_subj_name))
    LIMIT 1;
  END IF;

  IF v_grade_name <> '' THEN
    SELECT id INTO v_grade_id FROM public.grades 
    WHERE lower(trim(name)) = lower(trim(v_grade_name))
    LIMIT 1;
  END IF;

  -- Nếu URL rỗng mà có Drive File ID -> tự sinh link Drive xem trực tiếp
  IF (v_url IS NULL OR v_url = '') AND v_drive_file_id <> '' THEN
    v_url := 'https://drive.google.com/file/d/' || v_drive_file_id || '/view';
  ELSIF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://drive.google.com';
  END IF;

  -- 6. TẠO TÀI NGUYÊN (QUY TẮC BẢO MẬT TUYỆT ĐỐI: status = 'submitted')
  INSERT INTO public.resources (
    owner_id,
    teacher_id,
    title,
    description,
    resource_type,
    topic,
    subject_id,
    grade_id,
    department_id,
    school_year,
    resource_url,
    source_type,
    google_form_submission_id,
    google_drive_file_id,
    status,
    source_metadata,
    synced_at,
    created_at,
    updated_at,
    submitted_at
  )
  VALUES (
    v_teacher_id,
    v_teacher_id,
    v_title,
    v_desc,
    v_type_name,
    v_topic,
    v_subj_id,
    v_grade_id,
    v_dept_id,
    v_school_year,
    v_url,
    'google_form',
    v_submission_id,
    NULLIF(v_drive_file_id, ''),
    'submitted', -- BẮT BUỘC: ĐƯA VÀO QUY TRÌNH DUYỆT 2 CẤP
    p_payload,
    now(),
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_resource_id;

  -- 7. Ghi vào approval_history
  INSERT INTO public.approval_history (
    resource_id,
    actor_id,
    action,
    from_status,
    to_status,
    notes,
    created_at
  )
  VALUES (
    v_resource_id,
    v_teacher_id,
    'submit',
    'draft',
    'submitted',
    'Tài nguyên nộp qua Google Form nhúng trong ứng dụng.',
    now()
  );

  -- 8. Gửi thông báo cho chính Giáo viên
  INSERT INTO public.notifications (
    recipient_id,
    title,
    content,
    type,
    resource_id,
    is_read,
    created_at
  )
  VALUES (
    v_teacher_id,
    'Tài nguyên đã được tiếp nhận',
    'Tài nguyên "' || v_title || '" nộp qua Google Form đã được ghi nhận vào mục "Tài nguyên của tôi" (Trạng thái: Chờ duyệt).',
    'RESOURCE_SUBMITTED',
    v_resource_id,
    false,
    now()
  );

  -- 9. Gửi thông báo cho Tổ trưởng bộ môn (nếu có)
  IF v_dept_id IS NOT NULL THEN
    SELECT leader_id INTO v_leader_id FROM public.departments WHERE id = v_dept_id;
    IF v_leader_id IS NOT NULL AND v_leader_id <> v_teacher_id THEN
      INSERT INTO public.notifications (
        recipient_id,
        title,
        content,
        type,
        resource_id,
        is_read,
        created_at
      )
      VALUES (
        v_leader_id,
        'Học liệu mới cần thẩm định',
        'Giáo viên ' || v_teacher_full_name || ' vừa nộp tài nguyên "' || v_title || '" qua Google Form.',
        'SUBMISSION_FOR_REVIEW',
        v_resource_id,
        false,
        now()
      );
    END IF;
  END IF;

  -- 10. Ghi log thành công
  INSERT INTO public.resource_sync_logs (
    submission_id,
    source,
    teacher_email,
    resource_title,
    resource_id,
    status,
    payload,
    created_at,
    processed_at
  )
  VALUES (
    v_submission_id,
    'google_form',
    v_email,
    v_title,
    v_resource_id,
    'synced',
    p_payload,
    now(),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'synced',
    'message', 'Đồng bộ tài nguyên từ Google Form thành công.',
    'resource_id', v_resource_id,
    'submission_id', v_submission_id
  );
END;
$$;
