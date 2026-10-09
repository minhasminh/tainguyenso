import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Server, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary bắt được ngoại lệ:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHealthCheck = () => {
    window.location.href = '#/deployment-check';
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails } = this.state;

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Đã xảy ra sự cố không mong muốn
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              Ứng dụng Quản lý Tài nguyên số gặp lỗi trong quá trình xử lý giao diện.
              Dữ liệu của bạn không bị ảnh hưởng. Bạn có thể thử tải lại trang hoặc kiểm tra cấu hình hệ thống.
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Tải lại trang
              </button>

              <button
                type="button"
                onClick={this.handleGoHealthCheck}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer border border-slate-200"
              >
                <Server className="w-4 h-4" />
                Kiểm tra Deploy
              </button>
            </div>

            {/* Technical details toggle */}
            <div className="pt-4 border-t border-slate-100 text-left">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 font-medium py-1 cursor-pointer"
              >
                <span>Chi tiết kỹ thuật (dành cho lập trình viên / quản trị)</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetails && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
                  <div className="text-rose-400 font-bold mb-1">
                    {error?.name}: {error?.message}
                  </div>
                  {error?.stack && (
                    <div className="text-slate-400 whitespace-pre-wrap text-[10px] opacity-80">
                      {error.stack}
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div className="mt-2 text-indigo-300 whitespace-pre-wrap text-[10px] opacity-80">
                      Component Stack: {errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
