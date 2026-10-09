import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Layers } from 'lucide-react';
import { ResourceTypeStats } from '../../types';

interface ResourceTypeChartProps {
  data: ResourceTypeStats[];
  onSelectType?: (typeName: string) => void;
}

export function ResourceTypeChart({ data, onSelectType }: ResourceTypeChartProps) {
  if (!data || data.length === 0) return null;

  // Shorten name if too long for axis
  const chartData = data.map((d) => {
    let shortName = d.name;
    if (shortName.length > 18) {
      shortName = shortName.substring(0, 16) + '...';
    }
    return {
      ...d,
      shortName,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const full = chartData.find((d) => d.shortName === label || d.name === label);
      return (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-lg text-xs shadow-lg border border-slate-800">
          <p className="font-semibold text-slate-100 mb-1.5 pb-1 border-b border-slate-800">
            {full?.name || label}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Tổng số lượng:</span>
              <strong className="text-white">{full?.total || 0}</strong>
            </div>
            <div className="flex justify-between gap-4 text-emerald-400">
              <span>Đã phê duyệt:</span>
              <strong>{full?.approved || 0}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Thống kê theo Loại tài nguyên
            </h3>
            <p className="text-xs text-slate-500">Giáo án, bài giảng số, đề kiểm tra, video</p>
          </div>
        </div>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload[0]) {
                const item = state.activePayload[0].payload as ResourceTypeStats;
                if (onSelectType && item?.name) {
                  onSelectType(item.name);
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="shortName"
              width={110}
              tick={{ fontSize: 11, fill: '#334155' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              height={26}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => (value === 'total' ? 'Tổng số' : 'Đã duyệt')}
            />
            <Bar dataKey="total" name="total" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="approved" name="approved" fill="#10B981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
