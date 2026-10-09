-- ==============================================================================
-- PHIÊN BẢN 3: DASHBOARD VÀ THỐNG KÊ QUẢN LÝ TÀI NGUYÊN SỐ GIÁO VIÊN
-- Migration: 003_dashboard_statistics_schema.sql
-- ==============================================================================

-- 1. BẢNG NĂM HỌC (academic_years)
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Ví dụ: 2026–2027, 2025–2026
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed các năm học chuẩn
INSERT INTO public.academic_years (name, start_date, end_date, is_active)
VALUES 
    ('2026–2027', '2026-08-01', '2027-07-31', true),
    ('2025–2026', '2025-08-01', '2026-07-31', false),
    ('2024–2025', '2024-08-01', '2025-07-31', false)
ON CONFLICT (name) DO NOTHING;

-- 2. CẬP NHẬT CỘT BẢNG RESOURCES (TIMESTAMPS & PHÊ DUYỆT 2 CẤP)
ALTER TABLE public.resources
    ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS subject_leader_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS subject_leader_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS school_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS school_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. BẢNG LỊCH SỬ DUYỆT (approval_history)
CREATE TABLE IF NOT EXISTS public.approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action TEXT NOT NULL, -- submit, subject_leader_approve, subject_leader_reject, school_approve, school_reject, request_revision, resubmit
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. CHỈ MỤC TỐI ƯU HIỆU NĂNG DASHBOARD (INDEXES)
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_academic_year ON public.resources(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_resources_submitted_at ON public.resources(submitted_at);
CREATE INDEX IF NOT EXISTS idx_resources_approved_at ON public.resources(approved_at);
CREATE INDEX IF NOT EXISTS idx_approval_history_resource_id ON public.approval_history(resource_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_created_at ON public.approval_history(created_at DESC);

-- 5. VIEW TỔNG HỢP THEO TỔ CHUYÊN MÔN (resources_by_department)
CREATE OR REPLACE VIEW public.v_resources_by_department AS
SELECT 
    d.id AS department_id,
    d.name AS department_name,
    COUNT(r.id) AS total_resources,
    COUNT(r.id) FILTER (WHERE r.status = 'approved') AS approved_resources,
    COUNT(r.id) FILTER (WHERE r.status = 'submitted') AS pending_subject_leader,
    COUNT(r.id) FILTER (WHERE r.status IN ('pending_school_approval', 'subject_leader_approved')) AS pending_school,
    COUNT(r.id) FILTER (WHERE r.status = 'revision_required') AS revision_resources
FROM public.departments d
LEFT JOIN public.resources r ON r.department_id = d.id AND r.status != 'archived'
GROUP BY d.id, d.name;

-- 6. VIEW TỔNG HỢP THEO BỘ MÔN (resources_by_subject)
CREATE OR REPLACE VIEW public.v_resources_by_subject AS
SELECT 
    s.id AS subject_id,
    s.name AS subject_name,
    s.code AS subject_code,
    COUNT(r.id) AS total_resources,
    COUNT(r.id) FILTER (WHERE r.status = 'approved') AS approved_resources,
    COUNT(r.id) FILTER (WHERE r.status IN ('submitted', 'subject_leader_approved', 'pending_school_approval')) AS pending_resources
FROM public.subjects s
LEFT JOIN public.resources r ON r.subject_id = s.id AND r.status != 'archived'
GROUP BY s.id, s.name, s.code;

-- 7. VIEW TỔNG HỢP THEO KHỐI LỚP (resources_by_grade)
CREATE OR REPLACE VIEW public.v_resources_by_grade AS
SELECT 
    g.id AS grade_id,
    g.name AS grade_name,
    COUNT(r.id) AS total_resources,
    COUNT(r.id) FILTER (WHERE r.status = 'approved') AS approved_resources
FROM public.grades g
LEFT JOIN public.resources r ON r.grade_id = g.id AND r.status != 'archived'
GROUP BY g.id, g.name;

-- 8. FUNCTION TÍNH TOÁN THỜI GIAN TRUNG BÌNH PHÊ DUYỆT (RPC)
CREATE OR REPLACE FUNCTION public.get_approval_processing_times()
RETURNS TABLE (
    avg_subject_leader_hours NUMERIC,
    avg_school_hours NUMERIC,
    avg_total_hours NUMERIC,
    completed_count BIGINT,
    processing_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Thời gian Tổ trưởng: subject_leader_reviewed_at - submitted_at
        ROUND(AVG(
            EXTRACT(EPOCH FROM (r.subject_leader_reviewed_at - r.submitted_at)) / 3600.0
        )::NUMERIC, 1) AS avg_subject_leader_hours,
        
        -- Thời gian BGH: school_reviewed_at - subject_leader_reviewed_at
        ROUND(AVG(
            EXTRACT(EPOCH FROM (r.school_reviewed_at - COALESCE(r.subject_leader_reviewed_at, r.submitted_at))) / 3600.0
        )::NUMERIC, 1) AS avg_school_hours,
        
        -- Thời gian hoàn tất toàn trình: approved_at - submitted_at
        ROUND(AVG(
            EXTRACT(EPOCH FROM (r.approved_at - r.submitted_at)) / 3600.0
        )::NUMERIC, 1) AS avg_total_hours,

        COUNT(r.id) FILTER (WHERE r.status = 'approved') AS completed_count,
        COUNT(r.id) FILTER (WHERE r.status IN ('submitted', 'subject_leader_approved', 'pending_school_approval')) AS processing_count
    FROM public.resources r
    WHERE r.submitted_at IS NOT NULL;
END;
$$;

-- 9. PHÂN QUYỀN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- Academic Years: Mọi người đã đăng nhập được xem, chỉ ADMIN được sửa/thêm
CREATE POLICY "academic_years_select_all"
    ON public.academic_years FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "academic_years_admin_manage"
    ON public.academic_years FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Approval History: Xem lịch sử theo quyền của tài nguyên
CREATE POLICY "approval_history_select_policy"
    ON public.approval_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.resources r
            WHERE r.id = approval_history.resource_id
            AND (
                r.owner_id = auth.uid() OR
                r.status = 'approved' OR
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND (
                        p.role IN ('ADMIN', 'SCHOOL_ADMIN') OR
                        (p.role = 'SUBJECT_LEADER' AND p.department_id = r.department_id)
                    )
                )
            )
        )
    );

CREATE POLICY "approval_history_insert_policy"
    ON public.approval_history FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
    );
