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
import { GraduationCap } from 'lucide-react';
import { GradeStats } from '../../types';

interface GradeChartProps {
  data: GradeStats[];
  onSelectGrade?: (gradeId: string) => void;
}

export function GradeChart({ data, onSelectGrade }: GradeChartProps) {
  if (!data || data.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-slate-800">
          <p className="font-semibold text-slate-100 mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Tổng tài nguyên:</span>
              <strong className="text-white">{payload[0]?.payload?.total || 0}</strong>
            </div>
            <div className="flex justify-between gap-4 text-emerald-400">
              <span>Đã phê duyệt:</span>
              <strong>{payload[0]?.payload?.approved || 0}</strong>
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
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Thống kê theo Khối lớp
            </h3>
            <p className="text-xs text-slate-500">Khối 6, Khối 7, Khối 8, Khối 9</p>
          </div>
        </div>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload[0]) {
                const item = state.activePayload[0].payload as GradeStats;
                if (onSelectGrade && item?.id) {
                  onSelectGrade(item.id);
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#475569' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
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
            <Bar dataKey="total" name="total" fill="#6366F1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="approved" name="approved" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
