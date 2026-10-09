import React, { useState, useEffect } from 'react';
import { Resource } from '../../types';
import {
  generateQrDataUrl,
  downloadQrCode,
  shareResource,
  getPublicResourceUrl,
  ensureResourcePublicToken,
} from '../../utils/qrCodeHelper';
import { PrintQrModal } from './PrintQrModal';
import { useToast } from '../../hooks/useToast';
import { resourceService } from '../../services/resourceService';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Share2,
  Check,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface ResourceQrCardProps {
  resource: Resource;
  onAuditAction?: (action: string, description: string) => void;
}

export function ResourceQrCard({ resource, onAuditAction }: ResourceQrCardProps) {
  const toast = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isApproved = resource.status === 'approved';
  const publicToken = ensureResourcePublicToken(resource);
  const publicUrl = getPublicResourceUrl(publicToken);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // If resource didn't have a public_token yet, silently persist it
    if (!resource.public_token && resource.id) {
      resourceService
        .updateResource(resource.id, { public_token: publicToken }, null)
        .catch(() => {});
    }

    generateQrDataUrl(publicUrl, { width: 320, margin: 2 })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR:', err);
        if (isMounted) {
          // Instant reliable fallback using QR Server API
          const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(publicUrl)}`;
          setQrDataUrl(fallbackUrl);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [resource.id, resource.public_token, publicUrl, publicToken]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadQrCode(resource);
      toast.success('Đã tải mã QR Code (.png).');
      if (onAuditAction) {
        onAuditAction('DOWNLOAD_QR', `Tải mã QR cho tài nguyên "${resource.title}"`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải mã QR.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Đã sao chép liên kết tài nguyên.');
      setTimeout(() => setCopied(false), 2500);
      if (onAuditAction) {
        onAuditAction('COPY_RESOURCE_LINK', `Sao chép liên kết QR "${resource.title}"`);
      }
    } catch {
      toast.error('Không thể sao chép liên kết vào clipboard.');
    }
  };

  const handleShare = async () => {
    try {
      const res = await shareResource(resource);
      if (res.method === 'clipboard') {
        setCopied(true);
        toast.success('Đã sao chép liên kết tài nguyên để chia sẻ.');
        setTimeout(() => setCopied(false), 2500);
      } else if (res.shared) {
        toast.success('Đã mở chia sẻ tài nguyên.');
      }
      if (onAuditAction) {
        onAuditAction('COPY_RESOURCE_LINK', `Chia sẻ tài nguyên "${resource.title}"`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể chia sẻ tài nguyên.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-indigo-600" />
          Mã QR Truy Cập Nhanh
        </h3>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            isApproved
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {isApproved ? (
            <>
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Công khai qua QR
            </>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              Chưa duyệt
            </>
          )}
        </span>
      </div>

      {/* QR Code Display Container */}
      <div className="flex flex-col items-center">
        <div className="relative p-2.5 bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-2xs mb-2">
          {loading ? (
            <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-1 text-indigo-600" />
              <span className="text-[11px]">Đang tạo QR...</span>
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code - ${resource.title}`}
              className="w-44 h-44 object-contain rounded-xl"
            />
          ) : (
            <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
              <QrCode className="w-8 h-8 text-slate-300 mb-1" />
              <span>Chưa có mã QR</span>
            </div>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-700">
          Quét để mở tài nguyên
        </p>
        <p className="text-[11px] text-slate-400 text-center max-w-xs mt-0.5">
          Dùng điện thoại quét mã để truy cập nhanh trên slide, phiếu bài tập hoặc bảng tin.
        </p>

        {/* Public link preview */}
        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg max-w-full text-[11px] text-slate-600 font-mono">
          <span className="truncate max-w-[200px]">{publicUrl}</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-indigo-600 hover:text-indigo-800 shrink-0 font-sans font-medium"
            title="Sao chép liên kết"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        {!isApproved && (
          <div className="mt-2.5 p-2 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 text-center">
            Tài nguyên chưa phê duyệt chính thức sẽ được bảo vệ, người ngoài không thể mở qua QR.
          </div>
        )}
      </div>

      {/* Action Buttons (Section 5) */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading || downloading || !qrDataUrl}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          title="Tải mã QR định dạng hình ảnh PNG"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Tải QR (.png)
        </button>

        <button
          type="button"
          onClick={() => {
            setPrintModalOpen(true);
            if (onAuditAction) {
              onAuditAction('PRINT_QR', `Mở xem in mã QR tài nguyên "${resource.title}"`);
            }
          }}
          disabled={loading || !qrDataUrl}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          title="In phiếu QR chuẩn mực cho phiếu học tập / bảng tin"
        >
          <Printer className="w-3.5 h-3.5 text-slate-600" />
          In QR Code
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          title="Sao chép URL liên kết truy cập công khai"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
          {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          title="Chia sẻ qua điện thoại hoặc ứng dụng"
        >
          <Share2 className="w-3.5 h-3.5 text-indigo-600" />
          Chia sẻ
        </button>
      </div>

      {/* Print QR Modal */}
      <PrintQrModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        resource={resource}
      />
    </div>
  );
}
