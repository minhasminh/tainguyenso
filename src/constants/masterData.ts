import { Department, Subject, Grade, ResourceType } from '../types';

/**
 * MASTER CURRICULUM DATA SPECIFICATION
 * Dữ liệu chuẩn cố định cho toàn bộ ứng dụng:
 * 1. Tổ chuyên môn (Departments - 5 tổ)
 * 2. Môn học (Subjects - 20 môn học Tiểu học & THCS)
 * 3. Khối lớp (Grades - 9 khối từ Lớp 1 đến Lớp 9)
 * 4. Loại học liệu (Resource Types - 20 loại học liệu GDPT 2018)
 * 
 * Lưu ý: Tuyệt đối giữ nguyên cấu trúc, UUID và quan hệ cha-con cho các lần phát triển app sau.
 */

// 1. TỔ CHUYÊN MÔN (5 Tổ)
export const MASTER_DEPARTMENTS: Department[] = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    name: 'Tổ Khoa học tự nhiên',
    description: 'Phụ trách chuyên môn khoa học tự nhiên',
    leader_id: 'a3333333-3333-3333-3333-333333333333',
    created_at: '2026-09-26T14:53:31.054Z',
    updated_at: '2026-09-28T15:35:13.670Z',
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    name: 'Tổ Khoa học xã hội',
    description: 'Phụ trách giảng dạy môn khoa học xã hội',
    leader_id: 'a5385fd9-9593-4b37-97e7-7a8bb870d664',
    created_at: '2026-09-26T14:53:31.054Z',
    updated_at: '2026-09-28T15:36:10.097Z',
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    name: 'Tổ Tiếng Anh - GDTC',
    description: 'Phụ trách môn Tiếng Anh và Giáo dục thể chất',
    leader_id: 'f153bd53-27e8-4741-9976-89d458ff2d52',
    created_at: '2026-09-26T14:53:31.054Z',
    updated_at: '2026-09-28T15:36:35.203Z',
  },
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    name: 'Tổ 1-2-3',
    description: 'Phụ trách môn Tiểu học 1-2-3',
    leader_id: '1409ffd2-1242-45cb-8847-20babc334ebd',
    created_at: '2026-09-26T14:53:31.054Z',
    updated_at: '2026-09-28T15:34:36.952Z',
  },
  {
    id: 'd5555555-5555-5555-5555-555555555555',
    name: 'Tổ 4-5',
    description: 'Phụ trách môn Tiểu học 4-5',
    leader_id: '866f4bba-a0d7-4147-b55e-0edbf12e268c',
    created_at: '2026-09-26T14:53:31.054Z',
    updated_at: '2026-09-28T15:35:01.202Z',
  },
];

// 2. MÔN HỌC (20 Môn học chuẩn hóa)
export const MASTER_SUBJECTS: Subject[] = [
  // --- THCS: Khoa học tự nhiên & Công nghệ ---
  { id: 'c1111111-1111-1111-1111-111111111111', name: 'Toán', code: 'MATH', department_id: 'd1111111-1111-1111-1111-111111111111', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'c2222222-2222-2222-2222-222222222222', name: 'Tin học', code: 'CS', department_id: 'd1111111-1111-1111-1111-111111111111', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'c5555555-5555-5555-5555-555555555555', name: 'Khoa học tự nhiên (L)', code: 'SCI-L', department_id: 'd1111111-1111-1111-1111-111111111111', created_at: '2026-09-26T14:53:31.054Z' },
  { id: '92948ca5-dbed-4106-9e54-6accaffa2760', name: 'Khoa học tự nhiên (H)', code: 'SCI-H', department_id: 'd1111111-1111-1111-1111-111111111111', created_at: '2026-09-29T03:28:00.412Z' },
  { id: '374b27d0-1d1a-44e4-94a3-18a22c38dcd0', name: 'Khoa học tự nhiên (S)', code: 'SCI-S', department_id: 'd1111111-1111-1111-1111-111111111111', created_at: '2026-09-29T03:29:02.434Z' },
  { id: 'c9999999-9999-9999-9999-999999999999', name: 'Công nghệ', code: 'TECH', department_id: 'd1111111-1111-1111-1111-111111111111', created_at: '2026-09-26T14:53:31.054Z' },

  // --- THCS: Khoa học xã hội & Nghệ thuật ---
  { id: 'c3333333-3333-3333-3333-333333333333', name: 'Ngữ văn', code: 'LIT', department_id: 'd2222222-2222-2222-2222-222222222222', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'c6666666-6666-6666-6666-666666666666', name: 'Lịch sử', code: 'HIST', department_id: 'd2222222-2222-2222-2222-222222222222', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'c29c4d2d-d0e7-4ab7-ae3a-124ec3fd5373', name: 'Địa lí', code: 'GEO', department_id: 'd2222222-2222-2222-2222-222222222222', created_at: '2026-09-29T03:29:49.046Z' },
  { id: 'c7777777-7777-7777-7777-777777777777', name: 'Giáo dục công dân (GDCD)', code: 'CIVIC', department_id: 'd2222222-2222-2222-2222-222222222222', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Âm nhạc', code: 'MUSIC', department_id: 'd2222222-2222-2222-2222-222222222222', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Mĩ thuật', code: 'ART', department_id: 'd2222222-2222-2222-2222-222222222222', created_at: '2026-09-26T14:53:31.054Z' },

  // --- THCS: Ngoại ngữ & Thể chất ---
  { id: 'c4444444-4444-4444-4444-444444444444', name: 'Tiếng Anh', code: 'ENG', department_id: 'd3333333-3333-3333-3333-333333333333', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'c8888888-8888-8888-8888-888888888888', name: 'Giáo dục thể chất (GDTC)', code: 'PE', department_id: 'd3333333-3333-3333-3333-333333333333', created_at: '2026-09-26T14:53:31.054Z' },

  // --- Tiểu học: Khối 1-2-3 & 4-5 ---
  { id: 'c2c438d5-70aa-4c07-b7ab-dcb06fe3b899', name: 'Tiếng Việt', code: 'TH', department_id: 'd4444444-4444-4444-4444-444444444444', created_at: '2026-09-29T13:10:28.865Z' },
  { id: '025e4e1c-8ceb-4989-a84e-1c95a671c296', name: 'Đạo đức', code: 'TH', department_id: 'd4444444-4444-4444-4444-444444444444', created_at: '2026-09-29T13:10:55.834Z' },
  { id: '03227074-a991-4c7b-b858-e3a6810c4c46', name: 'Tự nhiên và xã hội', code: 'TH', department_id: 'd4444444-4444-4444-4444-444444444444', created_at: '2026-09-29T13:11:40.258Z' },
  { id: 'e218a2b5-5260-4a38-8011-4f86876818e1', name: 'Khoa học', code: 'TH', department_id: 'd5555555-5555-5555-5555-555555555555', created_at: '2026-09-29T13:13:27.814Z' },
  { id: 'ac997d97-2c92-41c3-b3ee-b3c4f54e9edf', name: 'Lịch sử và Địa lí (TH)', code: 'TH', department_id: 'd5555555-5555-5555-5555-555555555555', created_at: '2026-09-29T13:13:59.638Z' },
  { id: '2c3efc87-ed78-420f-86a2-c287ee512e08', name: 'Hoạt động trải nghiệm - Hướng nghiệp', code: 'HDKN', department_id: null, created_at: '2026-09-29T13:12:41.620Z' },
];

// 3. KHỐI LỚP (9 Khối: Tiểu học Khối 1-5 và THCS Khối 6-9)
export const MASTER_GRADES: Grade[] = [
  { id: 'd4fdecf6-3718-4fa2-8617-7d56b64a9098', name: 'Khối 1', level: 'Tiểu học', created_at: '2026-09-28T04:01:56.723Z' },
  { id: 'e0661454-8e76-4c47-8464-a1b7002d41ae', name: 'Khối 2', level: 'Tiểu học', created_at: '2026-09-28T04:02:04.274Z' },
  { id: '90998303-0b47-4018-8cde-3e9e324cf6f0', name: 'Khối 3', level: 'Tiểu học', created_at: '2026-09-28T04:02:11.407Z' },
  { id: '520057b6-8451-41fe-8ae1-4e20abae3c60', name: 'Khối 4', level: 'Tiểu học', created_at: '2026-09-28T04:02:18.549Z' },
  { id: 'c98f5f95-c0d8-4743-8cf3-be13ba8685f7', name: 'Khối 5', level: 'Tiểu học', created_at: '2026-09-28T04:02:25.476Z' },
  { id: 'e6666666-6666-6666-6666-666666666666', name: 'Khối 6', level: 'THCS', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'e7777777-7777-7777-7777-777777777777', name: 'Khối 7', level: 'THCS', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'e8888888-8888-8888-8888-888888888888', name: 'Khối 8', level: 'THCS', created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'e9999999-9999-9999-9999-999999999999', name: 'Khối 9', level: 'THCS', created_at: '2026-09-26T14:53:31.054Z' },
];

// 4. LOẠI HỌC LIỆU (20 Loại học liệu chuẩn hóa)
export const MASTER_RESOURCE_TYPES: ResourceType[] = [
  { id: 'f6fece64-9017-4518-9bfa-31b5d5073355', name: 'Kế hoạch bài dạy', code: 'KHBD', description: 'Giáo án soạn thảo chi tiết theo công văn 5512', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '89b83cc9-d8e6-40f4-b26d-6745d97becc2', name: 'Giáo án điện tử', code: 'GA_DIENTU', description: 'Bài soạn kết hợp đa phương tiện', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'b7aca4f9-4eee-4c7a-a109-b9bfdcde6bd9', name: 'Đề kiểm tra', code: 'DE_KT', description: 'Đề kiểm tra định kỳ, thường xuyên, giữa kỳ, cuối kỳ', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '5eba4b09-a6ff-4874-96ce-b54e3311efc6', name: 'Học liệu số', code: 'HOC_LIEU', description: 'Học liệu tương tác số hóa', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'd56e09b3-3d72-4d68-a183-9e0efd8c3bd2', name: 'Bài giảng e-learning', code: 'E_LEARNING', description: 'Gói bài giảng SCORM e-learning chuẩn hóa', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '84b43706-0fe3-44d7-ac65-726ca982c459', name: 'PowerPoint', code: 'PPT', description: 'Slide bài giảng trình chiếu trực quan', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'fcb062a5-864a-4c87-818b-c68a23e32202', name: 'Phiếu học tập', code: 'PHT', description: 'Phiếu bài tập giao nhiệm vụ cho học sinh', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '7c8598ef-f1b7-4ada-8bc1-4cffba24c364', name: 'Ma trận', code: 'MA_TRAN', description: 'Ma trận đề kiểm tra đánh giá năng lực', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '7df15cf3-2598-4a6a-bdae-137d8b692f3e', name: 'Đặc tả', code: 'DAC_TA', description: 'Bản đặc tả chi tiết mức độ nhận thức đề kiểm tra', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'a8706078-ac83-4f60-88b0-1a391029170c', name: 'Ngân hàng câu hỏi', code: 'NGAN_HANG', description: 'Tập hợp câu hỏi trắc nghiệm và tự luận chuẩn hóa', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '3b495ac0-c8e5-4269-bd1b-c7ab7987b4cf', name: 'Hình ảnh', code: 'IMAGE', description: 'Ảnh minh họa sơ đồ, bản đồ, tranh ảnh giáo khoa', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '235ed09a-25c7-4feb-90ca-73b3b30e555d', name: 'Video', code: 'VIDEO', description: 'Video thí nghiệm, clip tư liệu giảng dạy thực tế', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '80deeb3f-57a8-4fc9-866f-d82c2ebdab52', name: 'Âm thanh', code: 'AUDIO', description: 'File ghi âm phát âm ngoại ngữ, bài nghe, bài hát', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '7ca3a5a2-f42c-4950-a8d3-7ef4b19a357a', name: 'PDF', code: 'PDF', description: 'Tài liệu định dạng sách điện tử PDF', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '1055d3f6-282f-4037-8873-45cab9098f21', name: 'Word', code: 'DOC', description: 'Văn bản Word tài liệu tham khảo (.docx)', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '9426c3c1-c3b5-4875-aa19-ee82bc937e69', name: 'Excel', code: 'XLS', description: 'Bảng tính biểu mẫu số liệu, tính toán điểm', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'db2dcf68-5536-49b9-b646-36b7af037928', name: 'Phần mềm', code: 'SOFTWARE', description: 'Phần mềm mô phỏng, học tập tương tác', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '37ef7833-fa61-4e47-a363-c33bda078428', name: 'Tài nguyên AI', code: 'AI_RESOURCE', description: 'Tài liệu tích hợp công nghệ AI hỗ trợ giảng dạy', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: '04a16969-c8e4-4f57-b126-ba0330db3caa', name: 'Prompt AI', code: 'AI_PROMPT', description: 'Câu lệnh mẫu tương tác mô hình ngôn ngữ lớn AI', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
  { id: 'c6e83eae-08b0-4711-be77-2f23ca587000', name: 'Khác', code: 'OTHER', description: 'Các dạng tài liệu và học liệu số khác', is_active: true, created_at: '2026-09-26T14:53:31.054Z' },
];
