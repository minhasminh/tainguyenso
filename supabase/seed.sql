-- ==============================================================================
-- DỮ LIỆU KHỞI TẠO MẪU (SEED DATA - DEVELOPMENT / DEMO ONLY)
-- Hệ thống Quản lý Tài nguyên số Giáo viên
-- ==============================================================================

-- 1. THÊM TỔ CHUYÊN MÔN
INSERT INTO public.departments (id, name, description)
VALUES 
    ('d1111111-1111-1111-1111-111111111111', 'Tổ Toán – Tin', 'Phụ trách chuyên môn môn Toán học và Tin học các khối 6-9'),
    ('d2222222-2222-2222-2222-222222222222', 'Tổ Ngữ văn', 'Phụ trách giảng dạy môn Ngữ văn cấp THCS'),
    ('d3333333-3333-3333-3333-333333333333', 'Tổ Khoa học tự nhiên', 'Phụ trách môn Khoa học tự nhiên (Vật lí, Hóa học, Sinh học)'),
    ('d4444444-4444-4444-4444-444444444444', 'Tổ Ngoại ngữ', 'Phụ trách môn Tiếng Anh và các hoạt động câu lạc bộ ngoại ngữ'),
    ('d5555555-5555-5555-5555-555555555555', 'Tổ Sử – Địa – GDCD', 'Phụ trách môn Lịch sử và Địa lí, GDCD cấp THCS')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. THÊM BỘ MÔN
INSERT INTO public.subjects (id, name, code)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Toán', 'MATH'),
    ('c2222222-2222-2222-2222-222222222222', 'Tin học', 'CS'),
    ('c3333333-3333-3333-3333-333333333333', 'Ngữ văn', 'LIT'),
    ('c4444444-4444-4444-4444-444444444444', 'Tiếng Anh', 'ENG'),
    ('c5555555-5555-5555-5555-555555555555', 'Khoa học tự nhiên (KHTN)', 'SCI'),
    ('c6666666-6666-6666-6666-666666666666', 'Lịch sử và Địa lí', 'HIST_GEO'),
    ('c7777777-7777-7777-7777-777777777777', 'Giáo dục công dân (GDCD)', 'CIVIC'),
    ('c8888888-8888-8888-8888-888888888888', 'Giáo dục thể chất (GDTC)', 'PE'),
    ('c9999999-9999-9999-9999-999999999999', 'Công nghệ', 'TECH'),
    ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Âm nhạc', 'MUSIC'),
    ('cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mĩ thuật', 'ART')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    code = EXCLUDED.code;

-- 3. THÊM KHỐI LỚP
INSERT INTO public.grades (id, name)
VALUES
    ('e6666666-6666-6666-6666-666666666666', 'Khối 6'),
    ('e7777777-7777-7777-7777-777777777777', 'Khối 7'),
    ('e8888888-8888-8888-8888-888888888888', 'Khối 8'),
    ('e9999999-9999-9999-9999-999999999999', 'Khối 9')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name;

-- 4. HƯỚNG DẪN TẠO TÀI KHOẢN ADMIN ĐẦU TIÊN QUA SUPABASE DASHBOARD:
--
-- Bước 1: Vào Supabase Dashboard -> Authentication -> Users -> Add User (Create User)
-- Bước 2: Nhập Email (ví dụ: admin@thcs.edu.vn) và mật khẩu bảo mật (ví dụ: Admin@2026Secure)
-- Bước 3: Sau khi tạo xong, copy UUID của user đó và chạy câu lệnh SQL sau trong SQL Editor:
--
-- UPDATE public.profiles
-- SET 
--     full_name = 'Quản trị viên Hệ thống',
--     role = 'ADMIN',
--     status = 'active'
-- WHERE email = 'admin@thcs.edu.vn';
--
-- Bước 4: Đăng nhập vào ứng dụng với email & mật khẩu đã tạo.
