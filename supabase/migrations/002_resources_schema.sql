-- ==============================================================================
-- PHIÊN BẢN 2: MODULE QUẢN LÝ TÀI NGUYÊN SỐ GIÁO VIÊN
-- Migration: 002_resources_schema.sql
-- ==============================================================================

-- 1. BẢNG DANH MỤC LOẠI TÀI NGUYÊN (resource_types)
CREATE TABLE IF NOT EXISTS public.resource_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. BẢNG TÀI NGUYÊN SỐ (resources)
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL,
    class_name TEXT,
    school_year TEXT,
    topic TEXT,
    resource_type TEXT NOT NULL,
    resource_url TEXT NOT NULL,
    file_name TEXT,
    file_extension TEXT,
    file_size BIGINT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. CHỈ MỤC TỐI ƯU HIỆU NĂNG (INDEXES)
CREATE INDEX IF NOT EXISTS idx_resources_owner ON public.resources(owner_id);
CREATE INDEX IF NOT EXISTS idx_resources_department ON public.resources(department_id);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON public.resources(subject_id);
CREATE INDEX IF NOT EXISTS idx_resources_grade ON public.resources(grade_id);
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_school_year ON public.resources(school_year);
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at);
CREATE INDEX IF NOT EXISTS idx_resources_updated_at ON public.resources(updated_at DESC);

-- 4. TỰ ĐỘNG CẬP NHẬT updated_at TẠI DATABASE
CREATE OR REPLACE FUNCTION public.set_resources_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_resources_updated_at ON public.resources;
CREATE TRIGGER trg_set_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW
    EXECUTE FUNCTION public.set_resources_updated_at();

-- 5. BẢO VỆ BẢO MẬT & TIMESTAMP BẮT BUỘC (PREVENT RESOURCE TAMPERING)
CREATE OR REPLACE FUNCTION public.protect_resource_system_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    caller_role public.user_role;
    caller_id UUID;
BEGIN
    caller_id := auth.uid();
    SELECT role INTO caller_role FROM public.profiles WHERE id = caller_id;

    -- Không cho bất kỳ ai thay đổi created_at từ frontend
    NEW.created_at := OLD.created_at;

    -- Nếu không phải ADMIN:
    IF caller_role IS NULL OR caller_role != 'ADMIN' THEN
        -- 1. Tuyệt đối không cho thay đổi owner_id
        IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
            RAISE EXCEPTION 'Bảo mật: Không được phép thay đổi tác giả (owner_id) của tài nguyên.';
        END IF;

        -- 2. Giáo viên không được tự ý nâng status thành approved
        IF NEW.status = 'approved' AND OLD.status != 'approved' AND caller_role NOT IN ('SCHOOL_ADMIN', 'ADMIN') THEN
            RAISE EXCEPTION 'Bảo mật: Giáo viên không có quyền tự chuyển trạng thái thành Đã duyệt (approved).';
        END IF;

        -- 3. Không cho sửa approved_at hoặc approved_by nếu không có quyền thẩm định
        IF (NEW.approved_at IS DISTINCT FROM OLD.approved_at OR NEW.approved_by IS DISTINCT FROM OLD.approved_by) AND caller_role NOT IN ('SCHOOL_ADMIN', 'ADMIN') THEN
            RAISE EXCEPTION 'Bảo mật: Bạn không có quyền can thiệp thông tin người duyệt hoặc thời gian duyệt.';
        END IF;

        -- 4. Nếu tài nguyên đã được duyệt, giáo viên không được tự ý sửa nội dung trực tiếp
        IF OLD.status = 'approved' AND caller_role = 'TEACHER' THEN
            RAISE EXCEPTION 'Tài nguyên đã được duyệt chính thức. Vui lòng gửi yêu cầu nếu cần cập nhật.';
        END IF;
    END IF;

    -- Tự động ghi nhận submitted_at khi chuyển trạng thái sang submitted
    IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
        NEW.submitted_at := timezone('utc'::text, now());
    END IF;

    -- Tự động ghi nhận approved_at khi duyệt
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        NEW.approved_at := timezone('utc'::text, now());
        NEW.approved_by := caller_id;
    END IF;

    -- Tự động ghi nhận archived_at khi lưu trữ
    IF NEW.status = 'archived' AND OLD.status != 'archived' THEN
        NEW.archived_at := timezone('utc'::text, now());
        NEW.archived_by := caller_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_resource_system_fields ON public.resources;
CREATE TRIGGER trg_protect_resource_system_fields
    BEFORE UPDATE ON public.resources
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_resource_system_fields();

-- 6. KIỂM SOÁT INSERT: TỰ ĐỘNG GÁN OWNER & TỔ CHUYÊN MÔN
CREATE OR REPLACE FUNCTION public.validate_resource_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    effective_user_id UUID;
    caller_role public.user_role;
    caller_dept UUID;
    caller_status public.user_status;
    target_owner_status public.user_status;
    target_owner_dept UUID;
BEGIN
    -- Trường hợp 1: Tài nguyên nộp qua Google Form (Webhook/RPC/Edge Function)
    IF NEW.source_type = 'google_form' THEN
        SELECT status, department_id INTO target_owner_status, target_owner_dept
        FROM public.profiles
        WHERE id = NEW.owner_id;

        IF target_owner_status IS NULL OR target_owner_status != 'active' THEN
            RAISE EXCEPTION 'Tài khoản giáo viên không tồn tại hoặc chưa được kích hoạt.';
        END IF;

        IF NEW.department_id IS NULL AND target_owner_dept IS NOT NULL THEN
            NEW.department_id := target_owner_dept;
        END IF;

        IF NEW.status IS NULL OR NEW.status NOT IN ('submitted', 'draft') THEN
            NEW.status := 'submitted';
        END IF;

        NEW.created_at := timezone('utc'::text, now());
        NEW.updated_at := timezone('utc'::text, now());
        NEW.submitted_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    -- Trường hợp 2: Tài nguyên nhập trực tiếp trong giao diện ứng dụng (manual)
    effective_user_id := COALESCE(auth.uid(), NEW.owner_id);

    IF effective_user_id IS NULL THEN
        RAISE EXCEPTION 'Không xác định được thông tin người tạo tài nguyên.';
    END IF;

    SELECT role, department_id, status 
    INTO caller_role, caller_dept, caller_status
    FROM public.profiles 
    WHERE id = effective_user_id;

    IF caller_status IS NULL OR caller_status != 'active' THEN
        RAISE EXCEPTION 'Tài khoản của bạn chưa kích hoạt hoặc đã bị khóa.';
    END IF;

    IF caller_role != 'ADMIN' THEN
        IF auth.uid() IS NOT NULL AND NEW.owner_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Bảo mật: Không được tạo tài nguyên giả mạo người khác (owner_id phải là auth.uid()).';
        END IF;

        IF NEW.status = 'approved' THEN
            NEW.status := 'draft';
        END IF;

        IF NEW.department_id IS NULL THEN
            IF caller_dept IS NOT NULL THEN
                NEW.department_id := caller_dept;
            ELSE
                RAISE EXCEPTION 'Tài khoản của bạn chưa được gán tổ chuyên môn. Vui lòng liên hệ quản trị viên.';
            END IF;
        END IF;
    ELSE
        IF NEW.department_id IS NULL AND caller_dept IS NOT NULL THEN
            NEW.department_id := caller_dept;
        END IF;
    END IF;

    IF NEW.teacher_id IS NULL THEN
        NEW.teacher_id := NEW.owner_id;
    END IF;

    IF NEW.source_type IS NULL THEN
        NEW.source_type := 'manual';
    END IF;

    NEW.created_at := timezone('utc'::text, now());
    NEW.updated_at := timezone('utc'::text, now());

    IF NEW.status = 'submitted' THEN
        NEW.submitted_at := timezone('utc'::text, now());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_resource_insert ON public.resources;
CREATE TRIGGER trg_validate_resource_insert
    BEFORE INSERT ON public.resources
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_resource_insert();

-- 7. BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Policy cho resource_types:
DROP POLICY IF EXISTS "resource_types_select_policy" ON public.resource_types;
CREATE POLICY "resource_types_select_policy" ON public.resource_types
    FOR SELECT TO authenticated
    USING (public.is_user_active());

DROP POLICY IF EXISTS "resource_types_admin_policy" ON public.resource_types;
CREATE POLICY "resource_types_admin_policy" ON public.resource_types
    FOR ALL TO authenticated
    USING (public.is_user_active() AND public.get_user_role() = 'ADMIN')
    WITH CHECK (public.is_user_active() AND public.get_user_role() = 'ADMIN');

-- Policy cho resources:
-- SELECT:
-- 1. Admin & School Admin: xem toàn bộ
-- 2. Subject Leader: xem tài nguyên trong tổ mình, tài nguyên của mình, hoặc tài nguyên đã approved
-- 3. Teacher: chỉ xem tài nguyên của mình hoặc tài nguyên đã approved
DROP POLICY IF EXISTS "resources_select_policy" ON public.resources;
CREATE POLICY "resources_select_policy" ON public.resources
    FOR SELECT TO authenticated
    USING (
        public.is_user_active() AND (
            public.get_user_role() IN ('ADMIN', 'SCHOOL_ADMIN') OR
            (public.get_user_role() = 'SUBJECT_LEADER' AND (department_id = public.get_user_department_id() OR owner_id = auth.uid() OR status = 'approved')) OR
            (owner_id = auth.uid() OR status = 'approved')
        )
    );

-- INSERT: Giáo viên tạo tài nguyên của chính mình; Admin tạo tự do
DROP POLICY IF EXISTS "resources_insert_policy" ON public.resources;
CREATE POLICY "resources_insert_policy" ON public.resources
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_user_active() AND (
            public.get_user_role() = 'ADMIN' OR
            owner_id = auth.uid()
        )
    );

-- UPDATE: Giáo viên chỉ sửa tài nguyên của mình (khi chưa approved / archived); Admin sửa toàn quyền
DROP POLICY IF EXISTS "resources_update_policy" ON public.resources;
CREATE POLICY "resources_update_policy" ON public.resources
    FOR UPDATE TO authenticated
    USING (
        public.is_user_active() AND (
            public.get_user_role() = 'ADMIN' OR
            (owner_id = auth.uid() AND status NOT IN ('approved', 'archived'))
        )
    )
    WITH CHECK (
        public.is_user_active() AND (
            public.get_user_role() = 'ADMIN' OR
            (owner_id = auth.uid() AND status NOT IN ('approved', 'archived'))
        )
    );

-- DELETE: Giáo viên chỉ xóa tài nguyên của mình khi đang ở draft hoặc revision_required; Admin xóa toàn quyền
DROP POLICY IF EXISTS "resources_delete_policy" ON public.resources;
CREATE POLICY "resources_delete_policy" ON public.resources
    FOR DELETE TO authenticated
    USING (
        public.is_user_active() AND (
            public.get_user_role() = 'ADMIN' OR
            (owner_id = auth.uid() AND status IN ('draft', 'revision_required'))
        )
    );

-- ==============================================================================
-- DỮ LIỆU DANH MỤC LOẠI TÀI NGUYÊN MẶC ĐỊNH (20 LOẠI THEO MỤC 4)
-- ==============================================================================
INSERT INTO public.resource_types (name, code, description) VALUES
('Kế hoạch bài dạy', 'KHBD', 'Giáo án soạn thảo chi tiết theo công văn 5512'),
('Giáo án điện tử', 'GA_DIENTU', 'Bài soạn kết hợp đa phương tiện'),
('PowerPoint', 'PPT', 'Slide bài giảng trình chiếu trực quan'),
('Phiếu học tập', 'PHT', 'Phiếu bài tập giao nhiệm vụ cho học sinh'),
('Đề kiểm tra', 'DE_KT', 'Đề kiểm tra định kỳ, thường xuyên, giữa kỳ, cuối kỳ'),
('Ma trận', 'MA_TRAN', 'Ma trận đề kiểm tra đánh giá năng lực'),
('Đặc tả', 'DAC_TA', 'Bản đặc tả chi tiết mức độ nhận thức đề kiểm tra'),
('Ngân hàng câu hỏi', 'NGAN_HANG', 'Tập hợp câu hỏi trắc nghiệm và tự luận chuẩn hóa'),
('Hình ảnh', 'IMAGE', 'Ảnh minh họa sơ đồ, bản đồ, tranh ảnh giáo khoa'),
('Video', 'VIDEO', 'Video thí nghiệm, clip tư liệu giảng dạy thực tế'),
('Âm thanh', 'AUDIO', 'File ghi âm phát âm ngoại ngữ, bài nghe, bài hát'),
('PDF', 'PDF', 'Tài liệu định dạng sách điện tử PDF'),
('Word', 'DOC', 'Văn bản Word tài liệu tham khảo (.docx)'),
('Excel', 'XLS', 'Bảng tính biểu mẫu số liệu, tính toán điểm'),
('Phần mềm', 'SOFTWARE', 'Phần mềm mô phỏng, học tập tương tác'),
('Học liệu số', 'HOC_LIEU', 'Học liệu tương tác số hóa'),
('Tài nguyên AI', 'AI_RESOURCE', 'Tài liệu tích hợp công nghệ AI hỗ trợ giảng dạy'),
('Prompt AI', 'AI_PROMPT', 'Câu lệnh mẫu tương tác mô hình ngôn ngữ lớn AI'),
('Bài giảng e-learning', 'E_LEARNING', 'Gói bài giảng SCORM e-learning chuẩn hóa'),
('Khác', 'OTHER', 'Các dạng tài liệu và học liệu số khác')
ON CONFLICT (name) DO NOTHING;
