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
import { Building2 } from 'lucide-react';
import { DepartmentStats } from '../../types';

interface DepartmentChartProps {
  data: DepartmentStats[];
  onSelectDepartment?: (deptId: string) => void;
}

export function DepartmentChart({ data, onSelectDepartment }: DepartmentChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // Abbreviate long department names for X-Axis
  const chartData = data.map((d) => {
    let shortName = d.name;
    if (shortName.startsWith('Tổ ')) {
      shortName = shortName.replace('Tổ ', '');
    }
    return {
      ...d,
      shortName,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const fullItem = chartData.find((d) => d.shortName === label || d.name === label);
      return (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-lg text-xs shadow-lg border border-slate-800 min-w-[190px]">
          <p className="font-semibold text-slate-100 mb-1.5 pb-1 border-b border-slate-800">
            {fullItem?.name || label}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Tổng tài nguyên:</span>
              <strong className="text-white">{fullItem?.total || 0}</strong>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Đã phê duyệt:</span>
              <strong>{fullItem?.approved || 0}</strong>
            </div>
            <div className="flex justify-between text-purple-300">
              <span>Chờ BGH duyệt:</span>
              <strong>{fullItem?.pendingSchool || 0}</strong>
            </div>
            <div className="flex justify-between text-blue-300">
              <span>Chờ Tổ trưởng:</span>
              <strong>{fullItem?.pendingSubjectLeader || 0}</strong>
            </div>
            {fullItem?.revision ? (
              <div className="flex justify-between text-orange-400">
                <span>Cần chỉnh sửa:</span>
                <strong>{fullItem.revision}</strong>
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Thống kê theo Tổ / Bộ môn
            </h3>
            <p className="text-xs text-slate-500">
              So sánh số lượng tài nguyên và tình trạng thẩm định giữa các tổ
            </p>
          </div>
        </div>
      </div>

      <div className="w-full h-[270px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload[0]) {
                const item = state.activePayload[0].payload as DepartmentStats;
                if (onSelectDepartment && item?.id) {
                  onSelectDepartment(item.id);
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 11, fill: '#475569' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
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
              height={30}
              iconType="square"
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => {
                switch (value) {
                  case 'approved':
                    return 'Đã duyệt';
                  case 'pendingSchool':
                    return 'Chờ BGH';
                  case 'pendingSubjectLeader':
                    return 'Chờ Tổ trưởng';
                  case 'revision':
                    return 'Cần sửa';
                  default:
                    return value;
                }
              }}
            />
            <Bar dataKey="approved" name="approved" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pendingSchool" name="pendingSchool" stackId="a" fill="#8B5CF6" />
            <Bar dataKey="pendingSubjectLeader" name="pendingSubjectLeader" stackId="a" fill="#3B82F6" />
            <Bar dataKey="revision" name="revision" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
