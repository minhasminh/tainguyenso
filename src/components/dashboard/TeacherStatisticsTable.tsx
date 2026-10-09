import React, { useState } from 'react';
import { Users, Search, ArrowUpDown, Info, ChevronRight } from 'lucide-react';
import { TeacherStats, Profile } from '../../types';

interface TeacherStatisticsTableProps {
  data: TeacherStats[];
  profile: Profile | null;
  onSelectTeacher?: (teacherId: string) => void;
}

export function TeacherStatisticsTable({
  data,
  profile,
  onSelectTeacher,
}: TeacherStatisticsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'approved' | 'name'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Teachers do not see other teachers' statistics
  if (profile?.role === 'TEACHER' || !data || data.length === 0) {
    return null;
  }

  const filtered = data
    .filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.departmentName && t.departmentName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return sortOrder === 'asc' ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
    });

  const handleSort = (field: 'total' | 'approved' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {profile?.role === 'SUBJECT_LEADER' || profile?.role === 'VICE_SUBJECT_LEADER'
                ? 'Tiến độ Đóng góp của Giáo viên trong Tổ'
                : 'Thống kê Đóng góp Tài nguyên của Giáo viên'}
            </h3>
            <p className="text-xs text-slate-500">
              Số liệu khách quan hỗ trợ điều phối chuyên môn và xây dựng kho học liệu chung
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên giáo viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-56 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Ethical principle notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 mb-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-indigo-500 shrink-0" />
        <span>
          <strong>Lưu ý chuyên môn:</strong> Bảng thống kê phản ánh số lượng học liệu số nộp trên hệ thống, không dùng để tự động xếp loại hay đánh giá năng lực giáo viên.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/70">
              <th
                onClick={() => handleSort('name')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Họ và tên giáo viên</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold">Tổ chuyên môn</th>
              <th
                onClick={() => handleSort('total')}
                className="py-2.5 px-3 font-semibold text-center cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Tổng tài nguyên</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('approved')}
                className="py-2.5 px-3 font-semibold text-center cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Đã duyệt</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold text-center">Đang chờ xử lý</th>
              <th className="py-2.5 px-3 font-semibold">Tỷ lệ duyệt</th>
              <th className="py-2.5 px-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  Không tìm thấy giáo viên nào
                </td>
              </tr>
            ) : (
              filtered.map((teacher) => {
                const rate =
                  teacher.total > 0
                    ? Math.round((teacher.approved / teacher.total) * 100)
                    : 0;
                return (
                  <tr
                    key={teacher.id}
                    onClick={() => onSelectTeacher && onSelectTeacher(teacher.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{teacher.name}</div>
                      <div className="text-[11px] text-slate-400">{teacher.email}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {teacher.departmentName}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                      {teacher.total}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">
                      {teacher.approved}
                    </td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-medium">
                      {teacher.pending}
                    </td>
                    <td className="py-2.5 px-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 w-8 text-right">
                          {rate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300 group-hover:text-indigo-600 transition-colors">
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
