import React, { useState } from 'react';
import { Resource } from '../../types';
import { CheckCircle2, AlertTriangle, XCircle, Send, Loader2, X } from 'lucide-react';

export type WorkflowActionType =
  | 'submit'
  | 'subject_leader_approve'
  | 'subject_leader_revision'
  | 'subject_leader_reject'
  | 'school_approve'
  | 'school_revision'
  | 'school_reject';

interface ApprovalActionDialogProps {
  isOpen: boolean;
  actionType: WorkflowActionType | null;
  resource: Resource;
  onClose: () => void;
  onConfirm: (actionType: WorkflowActionType, comment: string) => Promise<void>;
}

export function ApprovalActionDialog({
  isOpen,
  actionType,
  resource,
  onClose,
  onConfirm,
}: ApprovalActionDialogProps) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !actionType) return null;

  const getActionConfig = () => {
    switch (actionType) {
      case 'submit':
        return {
          title: 'Gửi Duyệt Tài Nguyên',
          description: `Gửi tài nguyên "${resource.title}" tới Tổ trưởng chuyên môn thẩm định.`,
          icon: Send,
          iconClass: 'bg-blue-100 text-blue-700',
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
          btnText: 'Xác nhận gửi duyệt',
          placeholder: 'Nhập ghi chú cho Tổ trưởng (không bắt buộc)...',
          isCommentRequired: false,
        };
      case 'subject_leader_approve':
        return {
          title: 'Tổ Trưởng Thẩm Định & Chuyển BGH',
          description: `Xác nhận tài nguyên "${resource.title}" đạt yêu cầu chuyên môn và chuyển tiếp lên Ban Giám hiệu xem xét.`,
          icon: CheckCircle2,
          iconClass: 'bg-indigo-100 text-indigo-700',
          btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          btnText: 'Thông qua & Chuyển BGH',
          placeholder: 'Ý kiến thẩm định chuyên môn (VD: Đạt chuẩn CV 5512, chuyển BGH phê duyệt)...',
          isCommentRequired: false,
        };
      case 'subject_leader_revision':
      case 'school_revision':
        return {
          title: 'Yêu Cầu Giáo Viên Chỉnh Sửa',
          description: `Chuyển tài nguyên "${resource.title}" về trạng thái cần chỉnh sửa kèm góp ý cụ thể.`,
          icon: AlertTriangle,
          iconClass: 'bg-amber-100 text-amber-700',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          btnText: 'Gửi yêu cầu chỉnh sửa',
          placeholder: 'Vui lòng nêu rõ các điểm cần bổ sung hoặc điều chỉnh để giáo viên hoàn thiện...',
          isCommentRequired: true,
        };
      case 'subject_leader_reject':
      case 'school_reject':
        return {
          title: 'Từ Chối Phê Duyệt Tài Nguyên',
          description: `Từ chối tài nguyên "${resource.title}". Tài nguyên sẽ không thể đưa vào kho dùng chung.`,
          icon: XCircle,
          iconClass: 'bg-rose-100 text-rose-700',
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
          btnText: 'Từ chối duyệt',
          placeholder: 'Vui lòng nêu lý do từ chối cụ thể...',
          isCommentRequired: true,
        };
      case 'school_approve':
        return {
          title: 'Ban Giám Hiệu Phê Duyệt Chính Thức',
          description: `Phê duyệt tài nguyên "${resource.title}" đưa vào Kho tài nguyên số dùng chung toàn trường.`,
          icon: CheckCircle2,
          iconClass: 'bg-emerald-100 text-emerald-700',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          btnText: 'Phê duyệt cấp trường',
          placeholder: 'Ý kiến phê duyệt của BGH (VD: Phê duyệt đưa vào kho bài giảng số dùng chung)...',
          isCommentRequired: false,
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.isCommentRequired && !comment.trim()) {
      setError('Vui lòng nhập nội dung ý kiến hoặc lý do.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(actionType, comment.trim());
      setComment('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Thao tác không thành công.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${config.iconClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{config.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {config.description}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ý kiến thẩm định / Nhận xét góp ý
              {config.isCommentRequired && <span className="text-rose-500 ml-1">*</span>}
            </label>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              placeholder={config.placeholder}
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
              autoFocus
            />
            {error && (
              <p className="text-[11px] text-rose-600 mt-1 font-medium">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 ${config.btnClass}`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                config.btnText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
