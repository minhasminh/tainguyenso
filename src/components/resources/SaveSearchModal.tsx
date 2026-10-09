import React, { useState } from 'react';
import { ResourceFilterParams, Profile, SavedSearch } from '../../types';
import { savedSearchService } from '../../services/savedSearchService';
import { Bookmark, X, Check, Loader2 } from 'lucide-react';

interface SaveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  currentFilters: ResourceFilterParams;
  onSavedSuccess: (newSearch: SavedSearch) => void;
}

export function SaveSearchModal({
  isOpen,
  onClose,
  currentUser,
  currentFilters,
  onSavedSuccess,
}: SaveSearchModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên gợi nhớ cho bộ lọc');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const saved = await savedSearchService.createSavedSearch(
        currentUser,
        name.trim(),
        currentFilters
      );
      setName('');
      onSavedSuccess(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi lưu bộ lọc');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Lưu bộ lọc tìm kiếm</h3>
              <p className="text-xs text-slate-500">Lưu tiêu chí tìm kiếm hiện tại để truy cập nhanh sau này</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên bộ lọc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Ví dụ: Tài nguyên Tin học 8 đã duyệt, KHBD Ngữ văn..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">Tóm tắt tiêu chí lưu:</div>
            {currentFilters.search && <div>• Từ khóa: &quot;{currentFilters.search}&quot;</div>}
            {currentFilters.status && currentFilters.status !== 'all' && <div>• Trạng thái: {currentFilters.status}</div>}
            {currentFilters.statuses && currentFilters.statuses.length > 0 && <div>• Trạng thái: {currentFilters.statuses.join(', ')}</div>}
            {currentFilters.resource_types && currentFilters.resource_types.length > 0 && (
              <div>• Loại: {currentFilters.resource_types.join(', ')}</div>
            )}
            {currentFilters.grades && currentFilters.grades.length > 0 && (
              <div>• Khối lớp: {currentFilters.grades.length} khối</div>
            )}
            {currentFilters.school_year && currentFilters.school_year !== 'all' && (
              <div>• Năm học: {currentFilters.school_year}</div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu bộ lọc</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
