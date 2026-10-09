-- ==============================================================================
-- Migration 005: Google Form Resource Upload & Safe Synchronization Pipeline
-- Trường TH&THCS Nguyễn Đình Anh
-- ==============================================================================

-- 1. Thêm các cột nguồn và mã submission vào bảng resources
ALTER TABLE IF EXISTS public.resources
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual' CHECK (source_type IN ('manual', 'google_form', 'google_drive', 'api')),
  ADD COLUMN IF NOT EXISTS google_form_submission_id text,
  ADD COLUMN IF NOT EXISTS google_drive_file_id text,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

-- Chỉ mục tìm kiếm chống trùng lặp và lọc theo nguồn
CREATE INDEX IF NOT EXISTS idx_resources_google_form_submission_id ON public.resources (google_form_submission_id);
CREATE INDEX IF NOT EXISTS idx_resources_source_type ON public.resources (source_type);

-- 2. Bảng cấu hình hệ thống (system_settings) lưu tập trung URL Google Form & cấu hình
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Bật RLS cho system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép tất cả người dùng xem cấu hình hệ thống"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Chỉ Admin và School Admin được sửa cấu hình hệ thống"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SCHOOL_ADMIN')
    )
  );

-- Khởi tạo giá trị mặc định cho cấu hình Google Form
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'google_form_config',
  jsonb_build_object(
    'form_url', 'https://forms.gle/WP9FEjfZ64z2Wtf68',
    'sheet_url', 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    'is_active', true,
    'default_status', 'submitted',
    'instructions', 'Giáo viên vui lòng điền đúng email trường cấp và kiểm tra quyền chia sẻ file Google Drive trước khi gửi.',
    'webhook_url', 'https://ais-pre-6dztdf3opkquzmrgkkfkky-128131812770.asia-southeast1.run.app/api/sync-google-resource'
  ),
  'Cấu hình biểu mẫu Google Form nộp tài nguyên nhúng'
)
ON CONFLICT (key) DO NOTHING;

-- 3. Bảng nhật ký đồng bộ (resource_sync_logs)
CREATE TABLE IF NOT EXISTS public.resource_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text NOT NULL,
  source text NOT NULL DEFAULT 'google_form',
  teacher_email text NOT NULL,
  resource_title text NOT NULL,
  resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('synced', 'duplicate', 'failed', 'invalid', 'pending')),
  payload jsonb NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_submission_id ON public.resource_sync_logs (submission_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.resource_sync_logs (status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_teacher_email ON public.resource_sync_logs (teacher_email);

-- Bật RLS cho resource_sync_logs
ALTER TABLE public.resource_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin và BGH được xem toàn bộ nhật ký đồng bộ"
  ON public.resource_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SCHOOL_ADMIN')
    )
  );

CREATE POLICY "Giáo viên được xem nhật ký nộp bài theo email của mình"
  ON public.resource_sync_logs FOR SELECT
  TO authenticated
  USING (
    teacher_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- 4. Stored Procedure an toàn tiếp nhận và đồng bộ học liệu từ Google Form
-- TUYỆT ĐỐI BẢO MẬT: Bắt buộc trạng thái là 'submitted' (hoặc 'draft'), không bao giờ cho phép 'approved'
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
  
  v_teacher_id uuid;
  v_teacher_full_name text;
  v_dept_id uuid;
  v_subj_id uuid;
  v_grade_id uuid;
  v_resource_id uuid;
  v_existing_id uuid;
  v_leader_id uuid;
BEGIN
  -- 1. Bóc tách trường dữ liệu
  v_submission_id := trim(p_payload->>'submission_id');
  v_email := lower(trim(p_payload->>'teacher_email'));
  v_title := trim(p_payload->>'title');
  v_desc := trim(COALESCE(p_payload->>'description', ''));
  v_url := trim(COALESCE(p_payload->>'resource_url', ''));
  v_dept_name := trim(COALESCE(p_payload->>'department', ''));
  v_subj_name := trim(COALESCE(p_payload->>'subject', ''));
  v_grade_name := trim(COALESCE(p_payload->>'grade', ''));
  v_type_name := trim(COALESCE(p_payload->>'resource_type', 'Bài trình chiếu'));
  v_topic := trim(COALESCE(p_payload->>'topic', ''));
  v_school_year := trim(COALESCE(p_payload->>'academic_year', '2026–2027'));

  -- 2. Kiểm tra bắt buộc
  IF v_submission_id IS NULL OR v_submission_id = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid', 'message', 'Thiếu submission_id');
  END IF;

  IF v_title IS NULL OR v_title = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid', 'message', 'Thiếu tiêu đề tài nguyên');
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid', 'message', 'Thiếu email giáo viên');
  END IF;

  -- 3. Kiểm tra tính Idempotent (Chống trùng lặp submission)
  SELECT id INTO v_existing_id FROM public.resources WHERE google_form_submission_id = v_submission_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    INSERT INTO public.resource_sync_logs (submission_id, source, teacher_email, resource_title, resource_id, status, payload, error_message)
    VALUES (v_submission_id, 'google_form', v_email, v_title, v_existing_id, 'duplicate', p_payload, 'Đã nhận bản ghi này trước đó.');

    RETURN jsonb_build_object(
      'success', true,
      'status', 'duplicate',
      'message', 'Bản ghi đã được đồng bộ trước đó (Idempotent check).',
      'resource_id', v_existing_id
    );
  END IF;

  -- 4. Xác thực giáo viên trong hệ thống
  SELECT id, full_name, department_id INTO v_teacher_id, v_teacher_full_name, v_dept_id
  FROM public.profiles
  WHERE lower(email) = v_email AND status = 'active'
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    INSERT INTO public.resource_sync_logs (submission_id, source, teacher_email, resource_title, status, payload, error_message)
    VALUES (v_submission_id, 'google_form', v_email, v_title, 'invalid', p_payload, 'Không tìm thấy tài khoản giáo viên với email này');

    RETURN jsonb_build_object('success', false, 'status', 'invalid', 'message', 'Không tìm thấy tài khoản giáo viên có email: ' || v_email);
  END IF;

  -- 5. Map tổ chuyên môn, môn học, khối lớp
  IF v_dept_id IS NULL AND v_dept_name <> '' THEN
    SELECT id INTO v_dept_id FROM public.departments WHERE unaccent(lower(name)) = unaccent(lower(v_dept_name)) LIMIT 1;
  END IF;

  IF v_subj_name <> '' THEN
    SELECT id INTO v_subj_id FROM public.subjects WHERE unaccent(lower(name)) = unaccent(lower(v_subj_name)) LIMIT 1;
  END IF;

  IF v_grade_name <> '' THEN
    SELECT id INTO v_grade_id FROM public.grades WHERE unaccent(lower(name)) = unaccent(lower(v_grade_name)) LIMIT 1;
  END IF;

  -- 6. TẠO TÀI NGUYÊN (QUY TẮC BẢO MẬT TUYỆT ĐỐI: status = 'submitted')
  INSERT INTO public.resources (
    owner_id,
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
    updated_at
  )
  VALUES (
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
    p_payload->>'drive_file_id',
    'submitted', -- BẮT BUỘC: ĐƯA VÀO QUY TRÌNH DUYỆT 2 CẤP
    p_payload,
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
    'Tài nguyên được tải lên qua biểu mẫu Google Form nhúng trong app.',
    now()
  );

  -- 8. Gửi thông báo đến Tổ trưởng chuyên môn
  IF v_dept_id IS NOT NULL THEN
    SELECT id INTO v_leader_id FROM public.profiles WHERE department_id = v_dept_id AND role = 'SUBJECT_LEADER' LIMIT 1;
    IF v_leader_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        resource_id,
        created_at
      )
      VALUES (
        v_leader_id,
        'Học liệu số mới cần kiểm duyệt',
        'Giáo viên ' || v_teacher_full_name || ' vừa nộp tài nguyên "' || v_title || '" qua Google Form.',
        'review_request',
        v_resource_id,
        now()
      );
    END IF;
  END IF;

  -- 9. Ghi nhật ký đồng bộ thành công
  INSERT INTO public.resource_sync_logs (
    submission_id,
    source,
    teacher_email,
    resource_title,
    resource_id,
    status,
    payload
  )
  VALUES (
    v_submission_id,
    'google_form',
    v_email,
    v_title,
    v_resource_id,
    'synced',
    p_payload
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'synced',
    'message', 'Đồng bộ tài nguyên từ Google Form thành công! Tài nguyên đã được đưa vào trạng thái chờ duyệt.',
    'resource_id', v_resource_id
  );
END;
$$;
