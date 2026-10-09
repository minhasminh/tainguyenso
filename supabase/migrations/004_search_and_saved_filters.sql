-- ==============================================================================
-- PHIÊN BẢN 1: TÌM KIẾM VÀ LỌC NÂNG CAO TÀI NGUYÊN SỐ
-- Migration: 004_search_and_saved_filters.sql
-- ==============================================================================

-- 1. BẢNG LƯU BỘ LỌC TÌM KIẾM (saved_searches)
CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Tự động cập nhật updated_at cho saved_searches
CREATE OR REPLACE FUNCTION public.set_saved_searches_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_saved_searches_updated_at ON public.saved_searches;
CREATE TRIGGER trg_set_saved_searches_updated_at
    BEFORE UPDATE ON public.saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION public.set_saved_searches_updated_at();

-- 2. CHỈ MỤC TỐI ƯU HÓA TÌM KIẾM VÀ TRUY VẤN TỔ HỢP (INDEXES)
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON public.saved_searches(created_at DESC);

-- Các index hỗ trợ tìm kiếm nhanh & lọc nhiều trường trên bảng resources
CREATE INDEX IF NOT EXISTS idx_resources_title_trgm ON public.resources(title);
CREATE INDEX IF NOT EXISTS idx_resources_topic_trgm ON public.resources(topic);
CREATE INDEX IF NOT EXISTS idx_resources_composite_filter ON public.resources(status, subject_id, grade_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_date_approved ON public.resources(approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_date_submitted ON public.resources(submitted_at DESC);

-- 3. ROW LEVEL SECURITY (RLS) CHO SAVED_SEARCHES
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Người dùng chỉ được xem các bộ lọc do chính mình lưu
CREATE POLICY "saved_searches_select_own"
    ON public.saved_searches FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Người dùng chỉ được tạo bộ lọc gắn với user_id của mình
CREATE POLICY "saved_searches_insert_own"
    ON public.saved_searches FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Người dùng chỉ được cập nhật bộ lọc của mình
CREATE POLICY "saved_searches_update_own"
    ON public.saved_searches FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Người dùng chỉ được xóa bộ lọc của mình
CREATE POLICY "saved_searches_delete_own"
    ON public.saved_searches FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
