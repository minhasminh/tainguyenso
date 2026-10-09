# TÍCH HỢP TẢI TÀI NGUYÊN QUA GOOGLE FORM NHÚNG TRONG ỨNG DỤNG
**Trường TH&THCS Nguyễn Đình Anh**

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC THIẾT KẾ

Chức năng **"Tải tài nguyên"** cho phép giáo viên nộp học liệu số trực tiếp thông qua **Google Form được nhúng ngay trong ứng dụng** bằng `<iframe>`, không cần mở tab ngoài hay đăng nhập vào tài khoản khác nếu đã đăng nhập tài khoản trường.

### Nguyên tắc bảo mật cốt lõi:
1. **Google Form chỉ là kênh thu thập dữ liệu**, không được phép quyết định trạng thái phê duyệt.
2. Mọi tài nguyên gửi qua Google Form **bắt buộc được khởi tạo ở trạng thái `submitted` (Chờ duyệt)** và chuyển thẳng vào quy trình kiểm duyệt 2 cấp:
   $$\text{Giáo viên} \longrightarrow \text{Tổ trưởng chuyên môn} \longrightarrow \text{Ban Giám hiệu} \longrightarrow \text{Đã duyệt (Công khai)}$$
3. Tuyệt đối không chấp nhận các trường `status = 'approved'`, `school_reviewed_by` hay `approved_at` gửi từ phía Google Form hoặc Google Sheets.
4. Cơ chế chống trùng lặp **Idempotency** bằng mã `submission_id` duy nhất cho mỗi lượt gửi.
5. Xác thực giáo viên qua email trường (`@thcs-nguyendinhanh.edu.vn`) đã kích hoạt trong hệ thống.

---

## 2. SƠ ĐỒ KIẾN TRÚC VÀ LUỒNG DỮ LIỆU

```
+-------------------------------------------------------------+
|              GIÁO VIÊN (App Quản lý Tài nguyên số)          |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|         Trang "Tải tài nguyên" (#/upload-resource)          |
|      (Hướng dẫn quy trình 6 bước + Google Form iframe)     |
+-------------------------------------------------------------+
                              |
                              v (Gửi form)
+-------------------------------------------------------------+
|             GOOGLE FORM / GOOGLE SHEETS BẢN GHI             |
+-------------------------------------------------------------+
                              |
                              v (Trigger: onFormSubmit)
+-------------------------------------------------------------+
|       GOOGLE APPS SCRIPT (UrlFetchApp + Webhook Secret)     |
+-------------------------------------------------------------+
                              |
                              v (HTTPS POST / JSON Payload)
+-------------------------------------------------------------+
|   BACKEND API / SUPABASE RPC: sync_google_form_resource     |
|   - Kiểm tra submission_id (chống gửi lặp)                  |
|   - Tra cứu giáo viên qua email                             |
|   - Ánh xạ Tổ chuyên môn, Môn học, Khối lớp                 |
|   - Ép buộc status = 'submitted'                            |
|   - Bắn thông báo đến Tổ trưởng chuyên môn                  |
|   - Ghi nhật ký vào resource_sync_logs & activity_logs      |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|         QUY TRÌNH DUYỆT 2 CẤP THỰC HIỆN TRÊN APP            |
|   1. Tổ trưởng chuyên môn thẩm định -> Chờ BGH duyệt        |
|   2. Ban Giám hiệu ký duyệt -> Đã duyệt (Công khai)         |
+-------------------------------------------------------------+
```

---

## 3. CÁC TRANG VÀ THÀNH PHẦN ĐƯỢC BỔ SUNG

| Thành phần | Đường dẫn | Vai trò | Chức năng |
| :--- | :--- | :--- | :--- |
| **Trang Tải tài nguyên** | `#/upload-resource` | Tất cả giáo viên | Giao diện nhúng Google Form, quy trình 6 bước, lịch sử các bài đã gửi qua Form của tôi, hướng dẫn định dạng tệp. |
| **Trang Quản trị Google Form** | `#/admin/google-form` | Admin / BGH | Cập nhật URL biểu mẫu, URL trang tính, bật/tắt form, xem nhật ký đồng bộ, trình giả lập (Simulator) kiểm thử End-to-End, mã nguồn Apps Script. |
| **Menu Sidebar** | Sidebar | Toàn hệ thống | Thêm mục **"Tải tài nguyên"** (mục Tài nguyên) và **"Đồng bộ Google Form"** (mục Quản lý). |
| **Chi tiết tài nguyên** | `#/resources/:id` | Toàn hệ thống | Hiển thị huy hiệu `Nguồn Google Form`, mã nộp `submission_id`, thông tin thời gian đồng bộ. |
| **Danh sách tài nguyên** | `#/resources` | Toàn hệ thống | Huy hiệu Form trên từng thẻ/dòng bảng, bộ lọc nâng cao theo Nguồn (`Tất cả`, `Google Form`, `Nhập trực tiếp`). |
| **Gợi ý tại Thêm mới** | `#/resources/new` | Giáo viên | Banner gợi ý nộp nhanh qua Google Form nhúng. |

---

## 4. MÃ NGUỒN GOOGLE APPS SCRIPT (CODE.GS)

Dán mã sau vào **Tiện ích mở rộng → Apps Script** trong Google Sheets nhận phản hồi từ Form:

```javascript
/**
 * GOOGLE APPS SCRIPT - ĐỒNG BỘ TÀI NGUYÊN SỐ TỪ GOOGLE FORM SANG HỆ THỐNG
 * Gắn vào Google Sheet chứa câu trả lời của Google Form.
 * Trigger: On form submit
 */

const WEBHOOK_URL = "https://ais-pre-6dztdf3opkquzmrgkkfkky-128131812770.asia-southeast1.run.app/api/sync-google-resource";

function onFormSubmit(e) {
  try {
    const responses = e.namedValues;
    const timestamp = e.values[0] || new Date().toISOString();
    
    // Tự sinh mã submission duy nhất chống trùng lặp (Idempotent)
    const submissionId = "gf_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + "_" + Math.floor(Math.random() * 10000);

    // Lấy thông tin từ các câu hỏi trong Google Form
    const teacherEmail = (responses['Email'] || responses['Địa chỉ email'] || responses['Email giáo viên'] || [e.response?.getRespondentEmail() || ''])[0].trim();
    const teacherName = (responses['Họ và tên giáo viên'] || responses['Họ và tên'] || [''])[0].trim();
    const title = (responses['Tên tài nguyên'] || responses['Tiêu đề tài nguyên'] || responses['Tên học liệu'] || [''])[0].trim();
    const description = (responses['Mô tả nội dung'] || responses['Mô tả ngắn'] || [''])[0].trim();
    const resourceType = (responses['Loại tài nguyên'] || responses['Thể loại'] || [''])[0].trim();
    const department = (responses['Tổ chuyên môn'] || responses['Tổ bộ môn'] || [''])[0].trim();
    const subject = (responses['Môn học'] || [''])[0].trim();
    const grade = (responses['Khối lớp'] || responses['Khối'] || [''])[0].trim();
    const topic = (responses['Chủ đề / Bài học'] || responses['Chủ đề'] || [''])[0].trim();
    const resourceUrl = (responses['Liên kết tài nguyên'] || responses['Link Google Drive / Slides / Docs / Canva'] || responses['Tệp tài nguyên'] || [''])[0].trim();

    if (!title || !teacherEmail) {
      Logger.log("Thiếu trường bắt buộc title hoặc teacherEmail");
      return;
    }

    const payload = {
      submission_id: submissionId,
      submitted_at: new Date().toISOString(),
      teacher_email: teacherEmail,
      teacher_name: teacherName,
      department: department,
      subject: subject,
      grade: grade,
      title: title,
      description: description,
      resource_type: resourceType,
      topic: topic,
      academic_year: "2026–2027",
      resource_url: resourceUrl,
      source: "google_form"
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: {
        "X-Webhook-Secret": "SECURE_WEBHOOK_SECRET_KEY_2026"
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Kết quả đồng bộ: " + response.getContentText());

  } catch (err) {
    Logger.log("Lỗi đồng bộ Google Form: " + err.toString());
  }
}
```

---

## 5. HƯỚNG DẪN CẤU HÌNH TRÌNH KÍCH HOẠT (TRIGGER)

1. Mở file **Google Sheets** chứa phản hồi.
2. Vào **Tiện ích mở rộng (Extensions)** → **Apps Script**.
3. Dán đoạn mã trên vào tệp `Code.gs` và lưu lại.
4. Bấm biểu tượng **Kích hoạt (Triggers - hình chiếc đồng hồ)** ở thanh menu trái.
5. Bấm **+ Thêm trình kích hoạt (Add Trigger)**:
   - Hàm chọn: `onFormSubmit`
   - Nguồn sự kiện: `Từ bảng tính`
   - Loại sự kiện: `Khi gửi biểu mẫu (On form submit)`
6. Bấm **Lưu** và hoàn tất xác thực tài khoản Google.
