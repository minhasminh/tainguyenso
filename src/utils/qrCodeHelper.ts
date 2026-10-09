import QRCode from 'qrcode';
import { Resource } from '../types';

/**
 * Generate full public URL for a resource token
 */
export function getPublicResourceUrl(publicToken: string): string {
  if (typeof window === 'undefined') return `#/r/${publicToken}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const cleanPath = pathname.endsWith('/') ? pathname : pathname + '/';
  return `${origin}${cleanPath}#/r/${encodeURIComponent(publicToken)}`;
}

/**
 * Ensures a valid public_token exists for any resource
 */
export function ensureResourcePublicToken(resource: { id?: string; public_token?: string | null }): string {
  if (resource.public_token && resource.public_token.trim().length > 0) {
    return resource.public_token.trim();
  }
  if (resource.id && resource.id.trim().length > 0) {
    return 'pub_' + resource.id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  }
  return 'pub_' + Math.random().toString(36).substring(2, 10);
}

/**
 * Generate QR code Data URL (PNG base64) with fallback to SVG/API
 */
export async function generateQrDataUrl(
  text: string,
  options: { width?: number; margin?: number } = {}
): Promise<string> {
  const { width = 360, margin = 2 } = options;
  if (!text || text.trim().length === 0) {
    throw new Error('Nội dung mã QR không được để trống.');
  }

  try {
    return await QRCode.toDataURL(text, {
      width,
      margin,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (qrErr) {
    console.warn('QRCode.toDataURL failed, attempting SVG/API fallback:', qrErr);
    // Reliable online fallback generator
    return `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${width}&margin=${margin}&data=${encodeURIComponent(text)}`;
  }
}

/**
 * Generate QR code SVG string
 */
export async function generateQrSvg(
  text: string,
  options: { width?: number; margin?: number } = {}
): Promise<string> {
  const { width = 360, margin = 2 } = options;
  return await QRCode.toString(text, {
    type: 'svg',
    width,
    margin,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Sanitize filename to ensure compatibility across all operating systems (Windows, macOS, Linux)
 * Format: QR_[ten-tai-nguyen].png
 */
export function sanitizeFilename(title: string): string {
  // Remove accents
  const noAccents = (title || 'tai_nguyen')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  // Replace invalid OS filename characters: / \ ? % * : | " < > and control chars
  const safe = noAccents
    .replace(/[/\\?%*:|"<>#]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .substring(0, 50);

  return `QR_${safe || 'tai_nguyen'}.png`;
}

/**
 * Download QR Code as PNG file
 */
export async function downloadQrCode(resource: Resource): Promise<void> {
  const token = ensureResourcePublicToken(resource);
  const url = getPublicResourceUrl(token);
  const dataUrl = await generateQrDataUrl(url, { width: 600, margin: 3 });

  const filename = sanitizeFilename(resource.title);
  const downloadLink = document.createElement('a');
  downloadLink.href = dataUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/**
 * Web Share API helper with fallback
 */
export async function shareResource(
  resource: Resource
): Promise<{ shared: boolean; method: 'web-share' | 'clipboard' }> {
  const token = ensureResourcePublicToken(resource);
  const url = getPublicResourceUrl(token);
  const shareData = {
    title: resource.title,
    text: `Tài nguyên số: ${resource.title} - Trường TH&THCS Nguyễn Đình Anh`,
    url,
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return { shared: true, method: 'web-share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'web-share' };
      }
    }
  }

  // Fallback to clipboard
  await navigator.clipboard.writeText(url);
  return { shared: true, method: 'clipboard' };
}
