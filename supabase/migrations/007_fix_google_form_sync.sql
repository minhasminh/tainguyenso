-- ==============================================================================
-- Migration 007: Fix Google Form Sync Pipeline, Trigger Bypass & Idempotency
-- Trường TH&THCS Nguyễn Đình Anh
-- ==============================================================================

-- 1. Thêm chỉ mục UNIQUE trên google_form_submission_id để bảo đảm tính duy nhất (Idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_resources_google_form_submission_id 
  ON public.resources (google_form_submission_id) 
  WHERE google_form_submission_id IS NOT NULL;

-- 2. Cập nhật Trigger validate_resource_insert để hỗ trợ nộp qua Google Form
CREATE OR REPLACE FUNCTION public.validate_resource_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    caller_role public.user_role;
    caller_dept UUID;
    caller_status public.user_status;
    target_owner_status public.user_status;
    target_owner_dept UUID;
BEGIN
    -- Trường hợp 1: Tài nguyên nộp qua Google Form (Webhook/RPC/Edge Function)
    IF NEW.source_type = 'google_form' THEN
        -- Kiểm tra owner_id phải là tài khoản giáo viên hợp lệ và đang hoạt động
        SELECT status, department_id INTO target_owner_status, target_owner_dept
        FROM public.profiles
        WHERE id = NEW.owner_id;

        IF target_owner_status IS NULL OR target_owner_status != 'active' THEN
            RAISE EXCEPTION 'Tài khoản giáo viên không tồn tại hoặc chưa được kích hoạt.';
        END IF;

        -- Gán department_id nếu chưa có
        IF NEW.department_id IS NULL AND target_owner_dept IS NOT NULL THEN
            NEW.department_id := target_owner_dept;
        END IF;

        -- QUY TẮC BẢO MẬT TUYỆT ĐỐI: Không bao giờ cho phép nộp với status = approved
        IF NEW.status IS NULL OR NEW.status NOT IN ('submitted', 'draft') THEN
            NEW.status := 'submitted';
        END IF;

        NEW.created_at := timezone('utc'::text, now());
        NEW.updated_at := timezone('utc'::text, now());
        NEW.submitted_at := timezone('utc'::text, now());

        RETURN NEW;
    END IF;

    -- Trường hợp 2: Tài nguyên nhập trực tiếp trong giao diện ứng dụng (manual)
    SELECT role, department_id, status 
    INTO caller_role, caller_dept, caller_status
    FROM public.profiles 
    WHERE id = auth.uid();

    IF caller_status IS NULL OR caller_status != 'active' THEN
        RAISE EXCEPTION 'Tài khoản của bạn chưa kích hoạt hoặc đã bị khóa.';
    END IF;

    -- Nếu không phải ADMIN, bắt buộc owner_id phải là chính mình
    IF caller_role != 'ADMIN' THEN
        IF NEW.owner_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Bảo mật: Không được tạo tài nguyên giả mạo người khác (owner_id phải là auth.uid()).';
        END IF;

        -- Không cho phép tạo trực tiếp với status = approved
        IF NEW.status = 'approved' THEN
            NEW.status := 'draft';
        END IF;

        -- Kiểm tra tổ chuyên môn
        IF caller_dept IS NULL THEN
            RAISE EXCEPTION 'Tài khoản của bạn chưa được gán tổ chuyên môn. Vui lòng liên hệ quản trị viên.';
        END IF;

        -- Tự động gán department_id từ profile giáo viên
        NEW.department_id := caller_dept;
    END IF;

    -- Khởi tạo timestamps chuẩn server UTC
    NEW.created_at := timezone('utc'::text, now());
    NEW.updated_at := timezone('utc'::text, now());

    IF NEW.status = 'submitted' THEN
        NEW.submitted_at := timezone('utc'::text, now());
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Cập nhật Stored Procedure sync_google_form_resource
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
  -- 1. Bóc tách trường dữ liệu & chuẩn hóa
  v_submission_id := trim(COALESCE(p_payload->>'submission_id', ''));
  v_email := lower(trim(COALESCE(p_payload->>'teacher_email', p_payload->>'email', '')));
  v_title := trim(COALESCE(p_payload->>'title', ''));
  v_desc := trim(COALESCE(p_payload->>'description', ''));
  v_url := trim(COALESCE(p_payload->>'resource_url', ''));
  v_dept_name := trim(COALESCE(p_payload->>'department', ''));
  v_subj_name := trim(COALESCE(p_payload->>'subject', ''));
  v_grade_name := trim(COALESCE(p_payload->>'grade', ''));
  v_type_name := trim(COALESCE(p_payload->>'resource_type', 'Kế hoạch bài dạy'));
  v_topic := trim(COALESCE(p_payload->>'topic', ''));
  v_school_year := trim(COALESCE(p_payload->>'academic_year', '2026–2027'));

  -- 2. Kiểm tra bắt buộc
  IF v_submission_id IS NULL OR v_submission_id = '' THEN
    v_submission_id := 'gf_' || to_char(now(), 'YYYYMMDD_HH24MISS') || '_' || floor(random() * 10000)::text;
  END IF;

  IF v_email IS NULL OR v_email = '' OR position('@' in v_email) = 0 THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid', 'message', 'Email giáo viên không hợp lệ hoặc để trống.');
  END IF;

  IF v_title IS NULL OR v_title = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid', 'message', 'Tên tài nguyên không được để trống.');
  END IF;

  -- 3. Kiểm tra tính Idempotent (Chống trùng lặp submission)
  SELECT id INTO v_existing_id FROM public.resources WHERE google_form_submission_id = v_submission_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    INSERT INTO public.resource_sync_logs (submission_id, source, teacher_email, resource_title, resource_id, status, payload, error_message)
    VALUES (v_submission_id, 'google_form', v_email, v_title, v_existing_id, 'duplicate', p_payload, 'Đã nhận bản ghi này trước đó (Idempotent).');

    RETURN jsonb_build_object(
      'success', true,
      'status', 'duplicate',
      'message', 'Bản ghi đã được đồng bộ trước đó (Idempotent check).',
      'resource_id', v_existing_id
    );
  END IF;

  -- 4. Tìm kiếm giáo viên theo Email chuẩn hóa
  SELECT id, full_name, department_id INTO v_teacher_id, v_teacher_full_name, v_dept_id
  FROM public.profiles
  WHERE lower(trim(email)) = v_email AND status = 'active'
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    INSERT INTO public.resource_sync_logs (submission_id, source, teacher_email, resource_title, status, payload, error_message)
    VALUES (v_submission_id, 'google_form', v_email, v_title, 'invalid', p_payload, 'Không tìm thấy tài khoản giáo viên với email: ' || v_email);

    RETURN jsonb_build_object('success', false, 'status', 'invalid', 'message', 'Email giáo viên chưa được đăng ký trong hệ thống: ' || v_email);
  END IF;

  -- 5. Map tổ chuyên môn, môn học, khối lớp
  IF v_dept_id IS NULL AND v_dept_name <> '' THEN
    SELECT id INTO v_dept_id FROM public.departments WHERE lower(name) = lower(v_dept_name) LIMIT 1;
  END IF;

  IF v_subj_name <> '' THEN
    SELECT id INTO v_subj_id FROM public.subjects WHERE lower(name) = lower(v_subj_name) LIMIT 1;
  END IF;

  IF v_grade_name <> '' THEN
    SELECT id INTO v_grade_id FROM public.grades WHERE lower(name) = lower(v_grade_name) LIMIT 1;
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
    updated_at,
    submitted_at
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
    COALESCE(NULLIF(v_url, ''), 'https://drive.google.com'),
    'google_form',
    v_submission_id,
    p_payload->>'drive_file_id',
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

  -- 8. Gửi thông báo đến Giáo viên
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    resource_id,
    created_at
  )
  VALUES (
    v_teacher_id,
    'Tài nguyên đã được tiếp nhận từ Google Form',
    'Tài nguyên "' || v_title || '" đã được tiếp nhận thành công và đang chờ Tổ trưởng chuyên môn thẩm định.',
    'status_update',
    v_resource_id,
    now()
  );

  -- 9. Gửi thông báo đến Tổ trưởng chuyên môn
  IF v_dept_id IS NOT NULL THEN
    SELECT id INTO v_leader_id FROM public.profiles WHERE department_id = v_dept_id AND role = 'SUBJECT_LEADER' LIMIT 1;
    IF v_leader_id IS NOT NULL AND v_leader_id <> v_teacher_id THEN
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
        'Học liệu số mới từ Google Form cần thẩm định',
        'Giáo viên ' || v_teacher_full_name || ' vừa gửi tài nguyên "' || v_title || '" qua Google Form.',
        'review_request',
        v_resource_id,
        now()
      );
    END IF;
  END IF;

  -- 10. Ghi nhật ký đồng bộ thành công
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
    'message', 'Đồng bộ tài nguyên từ Google Form thành công! Tài nguyên đã được đưa vào trạng thái Chờ duyệt.',
    'resource_id', v_resource_id
  );
END;
$$;
