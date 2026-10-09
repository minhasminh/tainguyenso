-- ==============================================================================
-- PHIÊN BẢN 1: HỆ THỐNG QUẢN LÝ TÀI NGUYÊN SỐ GIÁO VIÊN
-- Migration: 001_initial_schema.sql
-- Nền tảng: Auth, RBAC, Profiles, Departments, Subjects, Grades, RLS & Activity Logs
-- ==============================================================================

-- 1. TẠO ENUM TYPES
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'ADMIN',
        'TEACHER',
        'SUBJECT_LEADER',
        'SCHOOL_ADMIN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.user_status AS ENUM (
        'active',
        'inactive',
        'locked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TẠO BẢNG DEPARTMENTS (Tổ chuyên môn)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    leader_id UUID, -- Sẽ gắn foreign key sau khi tạo bảng profiles để tránh circular dependency
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TẠO BẢNG SUBJECTS (Bộ môn)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TẠO BẢNG GRADES (Khối lớp)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TẠO BẢNG PROFILES (Hồ sơ người dùng - liên kết auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    role public.user_role NOT NULL DEFAULT 'TEACHER',
    status public.user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Thêm Foreign Key từ departments.leader_id -> profiles.id
DO $$ BEGIN
    ALTER TABLE public.departments
    ADD CONSTRAINT fk_departments_leader
    FOREIGN KEY (leader_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. TẠO BẢNG ACTIVITY_LOGS (Nhật ký hoạt động bảo mật)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TẠO CÁC INDEXES TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subject ON public.profiles(subject_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments(name);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON public.subjects(name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 8. CÁC HÀM BẢO MẬT & TIỆN ÍCH (SECURITY DEFINER ĐỂ TRÁNH RECURSION TRONG RLS)

-- Hàm lấy role của người dùng hiện tại an toàn tuyệt đối từ auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Hàm lấy tổ chuyên môn của người dùng hiện tại
CREATE OR REPLACE FUNCTION public.get_user_department_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Hàm kiểm tra trạng thái hoạt động của tài khoản
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(status = 'active', false) FROM public.profiles WHERE id = auth.uid();
$$;

-- Hàm trigger kiểm tra và ngăn chặn giáo viên tự ý nâng quyền role hoặc thay đổi status
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_caller_role public.user_role;
BEGIN
    -- Lấy role của caller thực tế từ auth.uid()
    SELECT role INTO current_caller_role FROM public.profiles WHERE id = auth.uid();

    -- Nếu không phải ADMIN (kể cả TEACHER, SUBJECT_LEADER, SCHOOL_ADMIN cố sửa role thành ADMIN)
    IF current_caller_role IS NULL OR current_caller_role != 'ADMIN' THEN
        -- Tuyệt đối không cho thay đổi vai trò (role)
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Bạn không có quyền thay đổi vai trò tài khoản (Chỉ Quản trị viên hệ thống có quyền này).';
        END IF;

        -- Tuyệt đối không cho thay đổi trạng thái tài khoản (status) nếu không phải ADMIN hoặc SCHOOL_ADMIN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF current_caller_role != 'SCHOOL_ADMIN' THEN
                RAISE EXCEPTION 'Bạn không có quyền thay đổi trạng thái kích hoạt của tài khoản.';
            END IF;
        END IF;

        -- Giáo viên không được tự ý đổi tổ chuyên môn hoặc bộ môn
        IF current_caller_role = 'TEACHER' THEN
            IF NEW.department_id IS DISTINCT FROM OLD.department_id OR NEW.subject_id IS DISTINCT FROM OLD.subject_id THEN
                RAISE EXCEPTION 'Giáo viên không có quyền tự thay đổi Tổ chuyên môn hoặc Bộ môn công tác.';
            END IF;
        END IF;
    END IF;

    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_updates ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_profile_updates
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_unauthorized_profile_updates();

-- Trigger tự động tạo profile khi một tài khoản auth.users được đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        'TEACHER',
        'active'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 9. THIẾT LẬP ROW LEVEL SECURITY (RLS) TẤT CẢ CÁC BẢNG
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- CHÍNH SÁCH RLS CHO BẢNG PROFILES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        -- Tài khoản phải active
        public.is_user_active()
        AND (
            -- 1. ADMIN và SCHOOL_ADMIN xem toàn bộ hồ sơ
            public.get_user_role() IN ('ADMIN', 'SCHOOL_ADMIN')
            -- 2. SUBJECT_LEADER xem hồ sơ giáo viên thuộc tổ của mình
            OR (
                public.get_user_role() = 'SUBJECT_LEADER' 
                AND department_id IS NOT NULL 
                AND department_id = public.get_user_department_id()
            )
            -- 3. TEACHER chỉ xem hồ sơ của chính mình
            OR (id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        public.is_user_active()
        AND (
            public.get_user_role() = 'ADMIN'
            OR (public.get_user_role() = 'SCHOOL_ADMIN' AND role != 'ADMIN')
            OR (id = auth.uid())
        )
    )
    WITH CHECK (
        public.is_user_active()
        AND (
            public.get_user_role() = 'ADMIN'
            OR (public.get_user_role() = 'SCHOOL_ADMIN' AND role != 'ADMIN')
            OR (id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_role() = 'ADMIN'
        OR id = auth.uid()
    );

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE TO authenticated
    USING (
        public.get_user_role() = 'ADMIN'
    );

-- ------------------------------------------------------------------------------
-- CHÍNH SÁCH RLS CHO DEPARTMENTS, SUBJECTS, GRADES
-- ------------------------------------------------------------------------------
-- Mọi người dùng đã đăng nhập và active đều được xem danh mục để chọn/hiển thị
DROP POLICY IF EXISTS "departments_select_policy" ON public.departments;
CREATE POLICY "departments_select_policy" ON public.departments
    FOR SELECT TO authenticated
    USING (public.is_user_active());

DROP POLICY IF EXISTS "departments_admin_all_policy" ON public.departments;
CREATE POLICY "departments_admin_all_policy" ON public.departments
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'ADMIN')
    WITH CHECK (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "subjects_select_policy" ON public.subjects;
CREATE POLICY "subjects_select_policy" ON public.subjects
    FOR SELECT TO authenticated
    USING (public.is_user_active());

DROP POLICY IF EXISTS "subjects_admin_all_policy" ON public.subjects;
CREATE POLICY "subjects_admin_all_policy" ON public.subjects
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'ADMIN')
    WITH CHECK (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "grades_select_policy" ON public.grades;
CREATE POLICY "grades_select_policy" ON public.grades
    FOR SELECT TO authenticated
    USING (public.is_user_active());

DROP POLICY IF EXISTS "grades_admin_all_policy" ON public.grades;
CREATE POLICY "grades_admin_all_policy" ON public.grades
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'ADMIN')
    WITH CHECK (public.get_user_role() = 'ADMIN');

-- ------------------------------------------------------------------------------
-- CHÍNH SÁCH RLS CHO ACTIVITY_LOGS (BẤT BIẾN - CHỈ INSERT VÀ XEM THEO QUYỀN)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_select_policy" ON public.activity_logs
    FOR SELECT TO authenticated
    USING (
        public.is_user_active()
        AND public.get_user_role() IN ('ADMIN', 'SCHOOL_ADMIN')
    );
-- Không tạo policy UPDATE hay DELETE cho activity_logs để bảo vệ tính toàn vẹn audit log.
