-- ==============================================================================
-- BẢN ĐẶC TẢ CẤU TRÚC DỮ LIỆU CHUẨN CỐ ĐỊNH (MASTER CURRICULUM DATA ARCHITECTURE)
-- Hệ thống Quản lý Tài nguyên số Giáo viên
-- Bao gồm 4 bảng lõi cốt lõi:
-- 1. Tổ chuyên môn (public.departments - 5 tổ)
-- 2. Môn học (public.subjects - 20 môn học)
-- 3. Khối lớp (public.grades - 9 khối từ Khối 1 đến Khối 9)
-- 4. Loại học liệu (public.resource_types - 20 loại học liệu GDPT 2018)
-- ==============================================================================

-- 1. BẢNG TỔ CHUYÊN MÔN (departments)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.departments (id, name, description)
VALUES 
    ('d1111111-1111-1111-1111-111111111111', 'Tổ Khoa học tự nhiên', 'Phụ trách chuyên môn khoa học tự nhiên'),
    ('d2222222-2222-2222-2222-222222222222', 'Tổ Khoa học xã hội', 'Phụ trách giảng dạy môn khoa học xã hội'),
    ('d3333333-3333-3333-3333-333333333333', 'Tổ Tiếng Anh - GDTC', 'Phụ trách môn Tiếng Anh và Giáo dục thể chất'),
    ('d4444444-4444-4444-4444-444444444444', 'Tổ 1-2-3', 'Phụ trách môn Tiểu học 1-2-3'),
    ('d5555555-5555-5555-5555-555555555555', 'Tổ 4-5', 'Phụ trách môn Tiểu học 4-5')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;


-- 2. BẢNG MÔN HỌC (subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.subjects (id, name, code, department_id)
VALUES 
    -- THCS: Khoa học tự nhiên & Công nghệ
    ('c1111111-1111-1111-1111-111111111111', 'Toán', 'MATH', 'd1111111-1111-1111-1111-111111111111'),
    ('c2222222-2222-2222-2222-222222222222', 'Tin học', 'CS', 'd1111111-1111-1111-1111-111111111111'),
    ('c5555555-5555-5555-5555-555555555555', 'Khoa học tự nhiên (L)', 'SCI-L', 'd1111111-1111-1111-1111-111111111111'),
    ('92948ca5-dbed-4106-9e54-6accaffa2760', 'Khoa học tự nhiên (H)', 'SCI-H', 'd1111111-1111-1111-1111-111111111111'),
    ('374b27d0-1d1a-44e4-94a3-18a22c38dcd0', 'Khoa học tự nhiên (S)', 'SCI-S', 'd1111111-1111-1111-1111-111111111111'),
    ('c9999999-9999-9999-9999-999999999999', 'Công nghệ', 'TECH', 'd1111111-1111-1111-1111-111111111111'),

    -- THCS: Khoa học xã hội & Nghệ thuật
    ('c3333333-3333-3333-3333-333333333333', 'Ngữ văn', 'LIT', 'd2222222-2222-2222-2222-222222222222'),
    ('c6666666-6666-6666-6666-666666666666', 'Lịch sử', 'HIST', 'd2222222-2222-2222-2222-222222222222'),
    ('c29c4d2d-d0e7-4ab7-ae3a-124ec3fd5373', 'Địa lí', 'GEO', 'd2222222-2222-2222-2222-222222222222'),
    ('c7777777-7777-7777-7777-777777777777', 'Giáo dục công dân (GDCD)', 'CIVIC', 'd2222222-2222-2222-2222-222222222222'),
    ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Âm nhạc', 'MUSIC', 'd2222222-2222-2222-2222-222222222222'),
    ('cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mĩ thuật', 'ART', 'd2222222-2222-2222-2222-222222222222'),

    -- THCS: Ngoại ngữ & Thể chất
    ('c4444444-4444-4444-4444-444444444444', 'Tiếng Anh', 'ENG', 'd3333333-3333-3333-3333-333333333333'),
    ('c8888888-8888-8888-8888-888888888888', 'Giáo dục thể chất (GDTC)', 'PE', 'd3333333-3333-3333-3333-333333333333'),

    -- Tiểu học: Khối 1-2-3 & 4-5
    ('c2c438d5-70aa-4c07-b7ab-dcb06fe3b899', 'Tiếng Việt', 'TH', 'd4444444-4444-4444-4444-444444444444'),
    ('025e4e1c-8ceb-4989-a84e-1c95a671c296', 'Đạo đức', 'TH', 'd4444444-4444-4444-4444-444444444444'),
    ('03227074-a991-4c7b-b858-e3a6810c4c46', 'Tự nhiên và xã hội', 'TH', 'd4444444-4444-4444-4444-444444444444'),
    ('e218a2b5-5260-4a38-8011-4f86876818e1', 'Khoa học', 'TH', 'd5555555-5555-5555-5555-555555555555'),
    ('ac997d97-2c92-41c3-b3ee-b3c4f54e9edf', 'Lịch sử và Địa lí (TH)', 'TH', 'd5555555-5555-5555-5555-555555555555'),
    ('2c3efc87-ed78-420f-86a2-c287ee512e08', 'Hoạt động trải nghiệm - Hướng nghiệp', 'HDKN', NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    department_id = EXCLUDED.department_id;


-- 3. BẢNG KHỐI LỚP (grades)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.grades (id, name)
VALUES 
    ('d4fdecf6-3718-4fa2-8617-7d56b64a9098', 'Khối 1'),
    ('e0661454-8e76-4c47-8464-a1b7002d41ae', 'Khối 2'),
    ('90998303-0b47-4018-8cde-3e9e324cf6f0', 'Khối 3'),
    ('520057b6-8451-41fe-8ae1-4e20abae3c60', 'Khối 4'),
    ('c98f5f95-c0d8-4743-8cf3-be13ba8685f7', 'Khối 5'),
    ('e6666666-6666-6666-6666-666666666666', 'Khối 6'),
    ('e7777777-7777-7777-7777-777777777777', 'Khối 7'),
    ('e8888888-8888-8888-8888-888888888888', 'Khối 8'),
    ('e9999999-9999-9999-9999-999999999999', 'Khối 9')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;


-- 4. BẢNG LOẠI HỌC LIỆU (resource_types)
CREATE TABLE IF NOT EXISTS public.resource_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.resource_types (id, name, code, description, is_active)
VALUES 
    ('f6fece64-9017-4518-9bfa-31b5d5073355', 'Kế hoạch bài dạy', 'KHBD', 'Giáo án soạn thảo chi tiết theo công văn 5512', true),
    ('89b83cc9-d8e6-40f4-b26d-6745d97becc2', 'Giáo án điện tử', 'GA_DIENTU', 'Bài soạn kết hợp đa phương tiện', true),
    ('b7aca4f9-4eee-4c7a-a109-b9bfdcde6bd9', 'Đề kiểm tra', 'DE_KT', 'Đề kiểm tra định kỳ, thường xuyên, giữa kỳ, cuối kỳ', true),
    ('5eba4b09-a6ff-4874-96ce-b54e3311efc6', 'Học liệu số', 'HOC_LIEU', 'Học liệu tương tác số hóa', true),
    ('d56e09b3-3d72-4d68-a183-9e0efd8c3bd2', 'Bài giảng e-learning', 'E_LEARNING', 'Gói bài giảng SCORM e-learning chuẩn hóa', true),
    ('84b43706-0fe3-44d7-ac65-726ca982c459', 'PowerPoint', 'PPT', 'Slide bài giảng trình chiếu trực quan', true),
    ('fcb062a5-864a-4c87-818b-c68a23e32202', 'Phiếu học tập', 'PHT', 'Phiếu bài tập giao nhiệm vụ cho học sinh', true),
    ('7c8598ef-f1b7-4ada-8bc1-4cffba24c364', 'Ma trận', 'MA_TRAN', 'Ma trận đề kiểm tra đánh giá năng lực', true),
    ('7df15cf3-2598-4a6a-bdae-137d8b692f3e', 'Đặc tả', 'DAC_TA', 'Bản đặc tả chi tiết mức độ nhận thức đề kiểm tra', true),
    ('a8706078-ac83-4f60-88b0-1a391029170c', 'Ngân hàng câu hỏi', 'NGAN_HANG', 'Tập hợp câu hỏi trắc nghiệm và tự luận chuẩn hóa', true),
    ('3b495ac0-c8e5-4269-bd1b-c7ab7987b4cf', 'Hình ảnh', 'IMAGE', 'Ảnh minh họa sơ đồ, bản đồ, tranh ảnh giáo khoa', true),
    ('235ed09a-25c7-4feb-90ca-73b3b30e555d', 'Video', 'VIDEO', 'Video thí nghiệm, clip tư liệu giảng dạy thực tế', true),
    ('80deeb3f-57a8-4fc9-866f-d82c2ebdab52', 'Âm thanh', 'AUDIO', 'File ghi âm phát âm ngoại ngữ, bài nghe, bài hát', true),
    ('7ca3a5a2-f42c-4950-a8d3-7ef4b19a357a', 'PDF', 'PDF', 'Tài liệu định dạng sách điện tử PDF', true),
    ('1055d3f6-282f-4037-8873-45cab9098f21', 'Word', 'DOC', 'Văn bản Word tài liệu tham khảo (.docx)', true),
    ('9426c3c1-c3b5-4875-aa19-ee82bc937e69', 'Excel', 'XLS', 'Bảng tính biểu mẫu số liệu, tính toán điểm', true),
    ('db2dcf68-5536-49b9-b646-36b7af037928', 'Phần mềm', 'SOFTWARE', 'Phần mềm mô phỏng, học tập tương tác', true),
    ('37ef7833-fa61-4e47-a363-c33bda078428', 'Tài nguyên AI', 'AI_RESOURCE', 'Tài liệu tích hợp công nghệ AI hỗ trợ giảng dạy', true),
    ('04a16969-c8e4-4f57-b126-ba0330db3caa', 'Prompt AI', 'AI_PROMPT', 'Câu lệnh mẫu tương tác mô hình ngôn ngữ lớn AI', true),
    ('c6e83eae-08b0-4711-be77-2f23ca587000', 'Khác', 'OTHER', 'Các dạng tài liệu và học liệu số khác', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;
