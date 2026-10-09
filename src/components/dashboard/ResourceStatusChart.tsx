import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ResourceStatusDistribution } from '../../types';

interface ResourceStatusChartProps {
  distribution: ResourceStatusDistribution[];
  totalResources: number;
}

export function ResourceStatusChart({
  distribution,
  totalResources,
}: ResourceStatusChartProps) {
  if (!distribution || distribution.length === 0 || totalResources === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col items-center justify-center min-h-[300px] text-center">
        <PieChartIcon className="w-10 h-10 text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-600">Chưa có dữ liệu trạng thái</p>
        <p className="text-xs text-slate-400 mt-1">
          Các tài nguyên thuộc bộ lọc hiện tại sẽ hiển thị tỷ lệ phân bổ ở đây.
        </p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ResourceStatusDistribution;
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-semibold">{data.name}</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-300">
            <span>Số lượng:</span>
            <span className="font-bold text-white">{data.count} tài nguyên</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-300">
            <span>Tỷ trọng:</span>
            <span className="font-bold text-indigo-300">{data.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            Tỷ lệ Trạng thái Phê duyệt
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Tổng: <strong className="text-slate-800">{totalResources}</strong>
        </span>
      </div>

      {/* Donut Chart with Centered Total */}
      <div className="relative w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={distribution}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              dataKey="count"
            >
              {distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={1} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-medium text-slate-400">TỔNG CỘNG</span>
          <span className="text-xl font-bold text-slate-800">{totalResources}</span>
          <span className="text-[10px] text-slate-500">tài nguyên</span>
        </div>
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        {distribution.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate pr-1">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-600 truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-700 font-medium shrink-0">
              <span>{item.count}</span>
              <span className="text-slate-400 font-normal">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
