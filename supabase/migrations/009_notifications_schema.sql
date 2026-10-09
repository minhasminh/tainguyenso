-- ==============================================================================
-- Migration 009: Central Notifications, Realtime Publications & Multi-Device Sync
-- HỆ THỐNG QUẢN LÝ TÀI NGUYÊN SỐ GIÁO VIÊN
-- ==============================================================================

-- 1. TẠO BẢNG THÔNG BÁO (notifications) LƯU TRÊN SUPABASE CLOUD
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'SYSTEM',
    resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. CHỈ MỤC TỐI ƯU HIỆU NĂNG CHO NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_resource_id ON public.notifications(resource_id);

-- 3. BẬT ROW LEVEL SECURITY (RLS) CHO BẢNG NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Người dùng chỉ được xem thông báo gửi tới mình
DROP POLICY IF EXISTS "Người dùng xem thông báo của mình" ON public.notifications;
CREATE POLICY "Người dùng xem thông báo của mình"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = recipient_id OR auth.uid() = user_id);

-- Cho phép người dùng trong hệ thống gửi thông báo (khi nộp bài, duyệt bài, yêu cầu sửa đổi)
DROP POLICY IF EXISTS "Tạo thông báo nghiệp vụ trong hệ thống" ON public.notifications;
CREATE POLICY "Tạo thông báo nghiệp vụ trong hệ thống"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Người dùng được đánh dấu đã đọc thông báo của chính mình
DROP POLICY IF EXISTS "Người dùng cập nhật trạng thái đọc thông báo của mình" ON public.notifications;
CREATE POLICY "Người dùng cập nhật trạng thái đọc thông báo của mình"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id OR auth.uid() = user_id)
    WITH CHECK (auth.uid() = recipient_id OR auth.uid() = user_id);

-- Người dùng được xóa thông báo của chính mình
DROP POLICY IF EXISTS "Người dùng xóa thông báo của mình" ON public.notifications;
CREATE POLICY "Người dùng xóa thông báo của mình"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (auth.uid() = recipient_id OR auth.uid() = user_id);

-- 4. BẬT SUPABASE REALTIME ĐỂ ĐỒNG BỘ TỨC THỜI GIỮA CÁC THIẾT BỊ
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_history;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION WHEN OTHERS THEN null; END $$;
