import React, { useEffect, useState } from 'react';
import { Resource } from '../../types';
import {
  generateQrDataUrl,
  getPublicResourceUrl,
  ensureResourcePublicToken,
} from '../../utils/qrCodeHelper';
import { Printer, X, Loader2 } from 'lucide-react';

interface PrintQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource;
  onPrinted?: () => void;
}

export function PrintQrModal({ isOpen, onClose, resource, onPrinted }: PrintQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const token = ensureResourcePublicToken(resource);
      const url = getPublicResourceUrl(token);
      generateQrDataUrl(url, { width: 400, margin: 2 })
        .then((data) => setQrDataUrl(data))
        .catch((err) => console.error('Error generating QR for print:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, resource]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
    if (onPrinted) onPrinted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800 text-sm">Xem trước bản in Mã QR</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 sm:p-8 bg-slate-100/50 flex justify-center">
          <div
            id="printable-qr-card"
            className="bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm w-full max-w-sm text-center flex flex-col items-center print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Header School */}
            <div className="text-xs uppercase font-extrabold tracking-widest text-slate-600 border-b border-slate-300 pb-2 mb-3 w-full">
              TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH
            </div>

            {/* Resource Title */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 px-2 leading-tight">
              {resource.title}
            </h2>

            {/* QR Code Container */}
            <div className="w-52 h-52 bg-white p-2 border-2 border-slate-900 rounded-xl flex items-center justify-center mb-3">
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              ) : (
                <img
                  src={qrDataUrl}
                  alt={`QR ${resource.title}`}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Guidance Text */}
            <p className="text-xs font-semibold text-slate-700 tracking-wide mb-4">
              Quét mã để truy cập tài nguyên
            </p>

            {/* Metadata (Clean, no internal IDs or logs) */}
            <div className="w-full pt-3 border-t border-dashed border-slate-300 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Môn học:</span>
                <span className="font-semibold text-slate-900">{resource.subject?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khối lớp:</span>
                <span className="font-semibold text-slate-900">
                  {resource.grade?.name || '—'} {resource.class_name ? `(${resource.class_name})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Năm học:</span>
                <span className="font-semibold text-slate-900">{resource.school_year || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons (Hidden in Print) */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-200 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            In ngay (Print)
          </button>
        </div>
      </div>
    </div>
  );
}
