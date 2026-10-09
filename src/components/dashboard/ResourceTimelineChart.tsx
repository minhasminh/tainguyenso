import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Activity, Calendar } from 'lucide-react';
import { DashboardTimelinePoint } from '../../types';

interface ResourceTimelineChartProps {
  timeline: DashboardTimelinePoint[];
  onTimeRangeChange?: (range: '7days' | '30days' | 'academic_year') => void;
  currentRange?: string;
}

export function ResourceTimelineChart({
  timeline,
  onTimeRangeChange,
  currentRange = '30days',
}: ResourceTimelineChartProps) {
  const [activeSeries, setActiveSeries] = useState<'all' | 'created' | 'approved'>('all');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-slate-800">
          <p className="font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Ngày {label}</span>
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-indigo-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Tạo mới:
              </span>
              <span className="font-bold">{payload[0]?.value || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-emerald-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Được duyệt:
              </span>
              <span className="font-bold">{payload[1]?.value || 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Tiến độ Tài nguyên theo Thời gian
            </h3>
            <p className="text-xs text-slate-500">
              Đối chiếu số lượng tạo mới và số lượng hoàn tất phê duyệt
            </p>
          </div>
        </div>

        {/* Series filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSeries('all')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeSeries === 'all'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setActiveSeries('created')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeSeries === 'created'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tạo mới
          </button>
          <button
            type="button"
            onClick={() => setActiveSeries('approved')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeSeries === 'approved'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Được duyệt
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full h-[260px]">
        {timeline.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <Activity className="w-8 h-8 text-slate-300 mb-1" />
            <span>Chưa có dữ liệu biến động trong khoảng thời gian này</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timeline}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
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
                height={30}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '-10px' }}
                formatter={(value) => {
                  return value === 'created'
                    ? 'Tài nguyên tạo mới'
                    : 'Tài nguyên được duyệt';
                }}
              />
              {(activeSeries === 'all' || activeSeries === 'created') && (
                <Area
                  type="monotone"
                  dataKey="created"
                  name="created"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                />
              )}
              {(activeSeries === 'all' || activeSeries === 'approved') && (
                <Area
                  type="monotone"
                  dataKey="approved"
                  name="approved"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorApproved)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
