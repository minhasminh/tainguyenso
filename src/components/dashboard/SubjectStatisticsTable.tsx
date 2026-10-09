import React, { useState } from 'react';
import { BookOpen, Search, ArrowUpDown, ChevronRight } from 'lucide-react';
import { SubjectStats } from '../../types';

interface SubjectStatisticsTableProps {
  data: SubjectStats[];
  onSelectSubject?: (subjectId: string) => void;
}

export function SubjectStatisticsTable({
  data,
  onSelectSubject,
}: SubjectStatisticsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'approved' | 'name'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filtered = data
    .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
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
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Thống kê theo Môn học
              </h3>
              <p className="text-xs text-slate-500">
                Tỷ lệ hoàn thành thẩm định theo từng môn giảng dạy
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên môn học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-48 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
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
                    <span>Môn học</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total')}
                  className="py-2.5 px-3 font-semibold text-center cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Tổng</span>
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
                <th className="py-2.5 px-3 font-semibold text-center">Chờ xử lý</th>
                <th className="py-2.5 px-3 font-semibold">Tỷ lệ duyệt</th>
                <th className="py-2.5 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Không tìm thấy môn học nào
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const rate =
                    item.total > 0 ? Math.round((item.approved / item.total) * 100) : 0;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectSubject && onSelectSubject(item.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">
                        {item.total}
                      </td>
                      <td className="py-2 px-3 text-center text-emerald-700 font-semibold">
                        {item.approved}
                      </td>
                      <td className="py-2 px-3 text-center text-amber-700 font-medium">
                        {item.pending}
                      </td>
                      <td className="py-2 px-3 w-32">
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
                      <td className="py-2 px-2 text-right text-slate-300 group-hover:text-indigo-600 transition-colors">
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
    </div>
  );
}
