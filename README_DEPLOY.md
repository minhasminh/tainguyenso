# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG QUẢN LÝ TÀI NGUYÊN SỐ GIÁO VIÊN

Ứng dụng web Single Page Application (SPA) xây dựng trên nền tảng **React + TypeScript + Vite + Supabase + Tailwind CSS**.

---

## 1. YÊU CẦU HỆ THỐNG
* **Node.js**: Phiên bản 18 trở lên (khuyên dùng Node.js 20 hoặc 22 LTS).
* **Hosting**: Bất kỳ máy chủ web Apache, LiteSpeed, Nginx hoặc cPanel thông dụng.
* **Cơ sở dữ liệu**: Supabase Cloud (PostgreSQL) hoặc Supabase Self-hosted.

---

## 2. CẤU HÌNH BIẾN MÔI TRƯỜNG (.env) CHO SUPABASE

### Quy tắc quan trọng về biến môi trường trong Vite:
* **Các biến bắt đầu bằng `VITE_*`**: Được Vite nhúng tĩnh (injected) vào mã nguồn trong quá trình đóng gói **`npm run build`**.
* Nếu bạn thay đổi giá trị trong file `.env` trên hosting/server hoặc local, bạn **BẮT BUỘC PHẢI CHẠY LẠI `npm run build`** và đồng bộ lại thư mục `dist/`.
* Các biến `VITE_*` không thể tự động thay đổi khi chỉ đổi file `.env` mà không build lại mã nguồn.

Tạo file `.env` ở thư mục gốc của dự án (sao chép từ `.env.example`):

```bash
cp .env.example .env
```

Điền các thông số Supabase chính xác:

```env
# 1. Project URL: Lấy từ Supabase Dashboard -> Project Settings -> API -> Project URL
# Bắt buộc giao thức HTTPS và có dạng https://<project-ref>.supabase.co
# (Tuyệt đối KHÔNG lấy link trang quản trị Dashboard)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co

# 2. Public Anon Key: Lấy từ Supabase Dashboard -> Project Settings -> API -> Project API keys
# Hỗ trợ 2 định dạng khóa công khai:
# - Legacy anon key (bắt đầu bằng eyJ...)
# - Publishable key thế hệ mới (bắt đầu bằng sb_publishable_...)
VITE_SUPABASE_ANON_KEY=your-publishable-or-legacy-anon-key
```

> **CẢNH BÁO AN TOÀN VÀ BẢO MẬT**:
> * Tuyệt đối **KHÔNG** đưa `SUPABASE_SERVICE_ROLE_KEY` hoặc các key bắt đầu bằng `sb_secret_` vào frontend hay file `.env` commit lên GitHub.
> * Tuyệt đối **KHÔNG** commit file `.env` chứa thông tin cấu hình thực tế vào GitHub. File `.env` đã được đưa vào `.gitignore`. Chỉ commit `.env.example` với dữ liệu minh họa.

---

## 3. CÀI ĐẶT VÀ ĐÓNG GÓI (BUILD)

### Bước 1: Cài đặt thư viện
```bash
npm install
```

### Bước 2: Đóng gói ứng dụng cho Production
```bash
npm run build
```

Lệnh này sẽ tự động biên dịch, tối ưu hóa CSS/JS và xuất ra thư mục phân phối `dist/`.

### Bước 3: Kiểm tra cấu trúc thư mục `dist/`
Sau khi chạy `npm run build`, thư mục `dist/` **BẮT BUỘC** phải có cấu trúc:

```text
dist/
├── index.html               # File cổng chính của ứng dụng SPA
├── .htaccess                # File cấu hình Rewrite Engine cho Apache
├── deployment-check.html    # Trang kiểm tra tĩnh kết nối hosting
└── assets/                  # Toàn bộ mã nguồn JS, CSS, hình ảnh đã nén
```

> **LƯU Ý**: Hệ thống đã được tích hợp plugin Vite tự động sao chép `public/.htaccess` vào `dist/.htaccess` mỗi lần build, đảm bảo file này không bao giờ bị sót.

---

## 4. HƯỚNG DẪN UPLOAD LÊN cPanel / HOSTING APACHE

### Bước 1: Xác định chính xác Document Root trên cPanel
1. Đăng nhập vào cPanel.
2. Vào mục **Domains** (hoặc **Addon Domains** / **Subdomains**).
3. Tìm tên miền của bạn và nhìn vào cột **Document Root**.
   * *Ví dụ*: `/home/username/public_html` hoặc `/home/username/public_html/tailnguyenso`.

### Bước 2: Tải lên mã nguồn
1. Mở **File Manager** trên cPanel.
2. Điều hướng vào thư mục **Document Root** đã xác định ở Bước 1.
3. Upload và giải nén **NỘI DUNG BÊN TRONG** thư mục `dist/` vào đây.

### Kết quả chuẩn:
```text
public_html/
    ├── index.html
    ├── .htaccess
    ├── deployment-check.html
    └── assets/
```

### ✕ NHỮNG LỖI CẦN TRÁNH:
* **KHÔNG ĐƯỢC** để: `public_html/dist/index.html` (Trừ khi Document Root trên cPanel được cấu hình trỏ trực tiếp vào thư mục `dist`).
* **KHÔNG ĐƯỢC** bỏ qua file `.htaccess` (Nếu thiếu `.htaccess`, khi người dùng ấn F5 ở các trang `/dashboard`, `/resources`, `/approval`... sẽ bị lỗi 404 Not Found).

---

## 5. KHẮC PHỤC CÁC LỖI THƯỜNG GẶP

### A. Lỗi trang mặc định của Apache:
*"If you are the owner of this website, please contact your hosting provider..."*
* **Nguyên nhân**: Hosting đang hiển thị file `index.html` hoặc `default.html` mặc định được sinh ra khi khởi tạo gói host.
* **Cách xử lý**:
  1. Vào File Manager, xóa các file `default.html`, `index.php` mặc định của hosting cũ.
  2. Đảm bảo file `index.html` của ứng dụng Quản lý Tài nguyên số nằm ngay tại Document Root.
  3. Xóa cache trình duyệt (Ctrl + Shift + R) hoặc thử truy cập bằng cửa sổ ẩn danh.

### B. Lỗi 404 khi nhấn F5 (Refresh) hoặc truy cập trực tiếp URL con:
* **Nguyên nhân**: Apache tìm kiếm file vật lý tương ứng với đường dẫn URL thay vì chuyển tiếp về `index.html`.
* **Cách xử lý**: Đảm bảo file `.htaccess` tồn tại trong Document Root với nội dung:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On

    RewriteBase /

    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    RewriteRule ^ index.html [L]
</IfModule>
```

### D. Kịch bản AutoDeploy (CI/CD hoặc Git Deployment trên cPanel / Máy chủ):
* **Lỗi thường gặp**: AutoDeploy chạy `npm install` và `npm run build` thành công, nhưng web vẫn hiển thị trang mặc định *"If you are the owner of this website..."*.
* **Nguyên nhân**: Máy chủ Webroot/Document Root vẫn trỏ vào thư mục chứa mã nguồn thay vì thư mục `dist`, hoặc kịch bản deploy chưa chép sản phẩm `dist/*` ra Document Root (`public_html`).
* **Kịch bản lệnh Deploy chuẩn (Deployment Script)**:
```bash
# 1. Cài đặt thư viện
npm install

# 2. Build production và tự động kiểm tra
npm run build

# 3. Chạy script kiểm tra độc lập (tùy chọn)
npm run verify:build

# 4. QUAN TRỌNG: Nếu hosting của bạn KHÔNG cho phép đổi Document Root sang /dist,
# hãy thêm lệnh đồng bộ nội dung dist ra thư mục webroot hiện tại:
# cp -rf dist/* .
# cp -f dist/.htaccess .
```


### C. Màn hình: "CHƯA CẤU HÌNH MÔI TRƯỜNG PRODUCTION":
* **Nguyên nhân**: Chưa điền `VITE_SUPABASE_URL` hoặc `VITE_SUPABASE_ANON_KEY` vào file `.env` trước khi build.
* **Cách xử lý**:
  1. Mở file `.env` trên máy hoặc server.
  2. Điền chính xác URL và Anon Key từ Supabase Project Dashboard.
  3. Chạy `npm run build` lại để Vite nhúng biến vào mã nguồn.
  4. Upload lại thư mục `dist/`.

---

## 6. CÔNG CỤ CHẨN ĐOÁN SỨC KHỎE (DEPLOYMENT HEALTH CHECK)

Sau khi upload, bạn có thể kiểm tra toàn diện hệ thống qua 2 đường dẫn:
1. **Kiểm tra File tĩnh**: `https://your-domain.com/deployment-check.html`
2. **Kiểm tra 10 Tiêu chí SPA**: `https://your-domain.com/deployment-check` (hoặc `#/deployment-check`)

Bảng kiểm tra sẽ tự động rà soát:
1. Frontend React & DOM
2. Biến môi trường (.env)
3. Kết nối Supabase PostgreSQL
4. Trạng thái Authentication
5. Runtime URL
6. Chứng chỉ bảo mật HTTPS
7. Trình duyệt người dùng
8. Build mode (Production / Development)
9. Apache SPA routing (.htaccess)
10. GitHub Webhook tự động hóa

---

## 7. CẤU TRÚC DANH MỤC DỮ LIỆU ĐƯỢC BẢO TOÀN
Ứng dụng giữ nguyên 100% cấu trúc dữ liệu chuẩn hóa của ngành giáo dục:
* **Tổ chuyên môn** (`departments`): Tự nhiên, Xã hội, Ngoại ngữ, Tiểu học...
* **Môn học** (`subjects`): Toán, Ngữ văn, Tiếng Anh, Khoa học tự nhiên, Lịch sử - Địa lý...
* **Khối lớp** (`grades`): Khối 1 đến Khối 9.
* **Loại học liệu** (`resource_types`): Kế hoạch bài dạy (Giáo án), Bài giảng điện tử, Đề kiểm tra, Video bài giảng, Thiết bị dạy học số...
* **Phân quyền người dùng (RBAC)**: Admin, School Admin (Hiệu trưởng / Phó hiệu trưởng), Subject Leader (Tổ trưởng / Tổ phó chuyên môn), Teacher (Giáo viên).
