import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { dashboardService } from '../services/dashboardService';
import { realtimeService } from '../services/realtimeService';
import { departmentService } from '../services/departmentService';
import { subjectService } from '../services/subjectService';
import { gradeService } from '../services/gradeService';
import { resourceTypeService } from '../services/resourceTypeService';
import {
  DashboardFilterParams,
  DashboardData,
  AcademicYear,
  Department,
  Subject,
  Grade,
  ResourceType,
  Resource,
} from '../types';

// Dashboard Modular Components
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { KPIGrid } from '../components/dashboard/KPIGrid';
import { ResourceStatusChart } from '../components/dashboard/ResourceStatusChart';
import { ResourceTimelineChart } from '../components/dashboard/ResourceTimelineChart';
import { DepartmentChart } from '../components/dashboard/DepartmentChart';
import { SubjectStatisticsTable } from '../components/dashboard/SubjectStatisticsTable';
import { GradeChart } from '../components/dashboard/GradeChart';
import { ResourceTypeChart } from '../components/dashboard/ResourceTypeChart';
import { TeacherStatisticsTable } from '../components/dashboard/TeacherStatisticsTable';
import { ApprovalProcessingTimeWidget } from '../components/dashboard/ApprovalProcessingTimeWidget';
import { PendingActionsWidget } from '../components/dashboard/PendingActionsWidget';
import { RecentActivitiesWidget } from '../components/dashboard/RecentActivitiesWidget';

export function DashboardPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [data, setData] = useState<DashboardData | null>(null);

  // Master lookup data
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);

  // Filter state
  const [filters, setFilters] = useState<DashboardFilterParams>(() => ({
    timeRange: '30days',
    academicYear: '2026–2027',
    departmentId: (profile?.role === 'SUBJECT_LEADER' || profile?.role === 'VICE_SUBJECT_LEADER') ? profile.department_id || 'all' : 'all',
    teacherId: 'all',
    subjectId: 'all',
    gradeId: 'all',
    resourceType: 'all',
    status: 'all',
  }));

  // Load lookup tables once on mount
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [ayRes, dRes, sRes, gRes, rtRes] = await Promise.all([
          dashboardService.getAcademicYears(),
          departmentService.getDepartments(profile),
          subjectService.getSubjects(profile),
          gradeService.getGrades(profile),
          resourceTypeService.getResourceTypes(profile),
        ]);

        setAcademicYears(ayRes);
        const activeYear = ayRes.find((y) => y.is_active);
        if (activeYear) {
          setFilters((prev) => ({ ...prev, academicYear: activeYear.name }));
        }
        setDepartments(dRes);
        setSubjects(sRes);
        setGrades(gRes);
        setResourceTypes(rtRes);
      } catch (err) {
        console.warn('Error loading master data:', err);
      }
    }
    loadMasterData();
  }, [profile]);

  // Load dashboard statistics
  const fetchDashboardData = useCallback(
    async (currentFilters: DashboardFilterParams) => {
      if (!profile) return;
      try {
        setLoading(true);
        const result = await dashboardService.getDashboardData(profile, currentFilters);
        setData(result);
        setLastUpdated(new Date());
      } catch (err: any) {
        console.error('Error fetching dashboard statistics:', err);
        toast.error(err.message || 'Không thể tải dữ liệu thống kê');
      } finally {
        setLoading(false);
      }
    },
    [profile, toast]
  );

  useEffect(() => {
    fetchDashboardData(filters);

    const unsubscribeRes = realtimeService.subscribeToResources(() => {
      fetchDashboardData(filters);
    });
    const unsubscribeApproval = realtimeService.subscribeToApprovalHistory(() => {
      fetchDashboardData(filters);
    });

    return () => {
      unsubscribeRes();
      unsubscribeApproval();
    };
  }, [fetchDashboardData, filters]);

  // Actions
  const handleRefresh = () => {
    fetchDashboardData(filters);
    toast.success('Đã cập nhật số liệu mới nhất');
  };

  const handleApplyFilters = (newFilters: DashboardFilterParams) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    const defaultFilters: DashboardFilterParams = {
      timeRange: '30days',
      academicYear: '2026–2027',
      departmentId: (profile?.role === 'SUBJECT_LEADER' || profile?.role === 'VICE_SUBJECT_LEADER') ? profile.department_id || 'all' : 'all',
      teacherId: 'all',
      subjectId: 'all',
      gradeId: 'all',
      resourceType: 'all',
      status: 'all',
    };
    setFilters(defaultFilters);
  };

  const handleExportReport = () => {
    if (!data) return;
    try {
      dashboardService.exportReportToCSV(data, profile);
      toast.success('Đã xuất báo cáo thống kê CSV (tương thích Microsoft Excel)');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xuất báo cáo');
    }
  };

  const handleNavigateToResources = (statusFilter?: string) => {
    if (statusFilter && statusFilter !== 'all') {
      window.location.hash = `#/resources?status=${statusFilter}`;
    } else {
      window.location.hash = '#/resources';
    }
  };

  const handleViewResource = (resource: Resource) => {
    window.location.hash = `#/resources/${resource.id}`;
  };

  const handleReviewResource = (resource: Resource) => {
    window.location.hash = `#/resources/${resource.id}?action=review`;
  };

  const handleSelectDepartment = (deptId: string) => {
    setFilters((prev) => ({
      ...prev,
      departmentId: deptId,
      subjectId: 'all',
    }));
  };

  const handleSelectSubject = (subjectId: string) => {
    setFilters((prev) => ({
      ...prev,
      subjectId,
    }));
  };

  const handleSelectGrade = (gradeId: string) => {
    setFilters((prev) => ({
      ...prev,
      gradeId,
    }));
  };

  const handleSelectResourceType = (typeName: string) => {
    setFilters((prev) => ({
      ...prev,
      resourceType: typeName,
    }));
  };

  const handleSelectTeacher = (teacherId: string) => {
    setFilters((prev) => ({
      ...prev,
      teacherId,
    }));
  };

  const isTeacher = profile?.role === 'TEACHER';
  const isSubjectLeader = profile?.role === 'SUBJECT_LEADER' || profile?.role === 'VICE_SUBJECT_LEADER';
  const isLeaderOrAdmin =
    profile?.role === 'ADMIN' ||
    profile?.role === 'SCHOOL_ADMIN' ||
    profile?.role === 'VICE_PRINCIPAL' ||
    profile?.role === 'SUBJECT_LEADER' ||
    profile?.role === 'VICE_SUBJECT_LEADER';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Dashboard Header */}
      <DashboardHeader
        profile={profile}
        lastUpdated={lastUpdated}
        isLoading={loading}
        onRefresh={handleRefresh}
        onExport={handleExportReport}
      />

      {/* 2. Filter Bar */}
      <DashboardFilters
        profile={profile}
        filters={filters}
        academicYears={academicYears}
        departments={departments}
        subjects={subjects}
        grades={grades}
        resourceTypes={resourceTypes}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Loading Skeletons */}
      {loading && !data ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200/80 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-80 bg-slate-200/80 rounded-xl" />
            <div className="lg:col-span-2 h-80 bg-slate-200/80 rounded-xl" />
          </div>
        </div>
      ) : data ? (
        <>
          {/* 3. KPI Summary Grid */}
          <KPIGrid
            kpis={data.kpis}
            profile={profile}
            onNavigateToResources={handleNavigateToResources}
          />

          {/* 4. Chart Row 1: Status Donut (1/3) + Timeline Area (2/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ResourceStatusChart
                distribution={data.statusDistribution}
                totalResources={data.kpis.total}
              />
            </div>
            <div className="lg:col-span-2">
              <ResourceTimelineChart
                timeline={data.timeline}
                currentRange={filters.timeRange}
              />
            </div>
          </div>

          {/* 5. Chart Row 2: Department Bar Chart + Subject Statistics Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {!isTeacher && data.departmentStats && data.departmentStats.length > 0 && (
              <DepartmentChart
                data={data.departmentStats}
                onSelectDepartment={handleSelectDepartment}
              />
            )}
            <div className={isTeacher ? 'lg:col-span-2' : ''}>
              <SubjectStatisticsTable
                data={data.subjectStats}
                onSelectSubject={handleSelectSubject}
              />
            </div>
          </div>

          {/* 6. Chart Row 3: Grade Chart (1/2) + Resource Type Chart (1/2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GradeChart data={data.gradeStats} onSelectGrade={handleSelectGrade} />
            <ResourceTypeChart
              data={data.resourceTypeStats}
              onSelectType={handleSelectResourceType}
            />
          </div>

          {/* 7. Teacher Statistics Table (for Admin, BGH, Subject Leader) */}
          {isLeaderOrAdmin && data.teacherStats && data.teacherStats.length > 0 && (
            <TeacherStatisticsTable
              data={data.teacherStats}
              profile={profile}
              onSelectTeacher={handleSelectTeacher}
            />
          )}

          {/* 8. Approval Processing Time Widget (for Admin, BGH, Subject Leader) */}
          {isLeaderOrAdmin && data.processingTimes && (
            <ApprovalProcessingTimeWidget data={data.processingTimes} />
          )}

          {/* 9. Pending Actions ("CẦN XỬ LÝ") & Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PendingActionsWidget
              resources={data.pendingActions}
              profile={profile}
              onViewResource={handleViewResource}
              onReviewResource={handleReviewResource}
            />
            <RecentActivitiesWidget
              activities={data.recentActivities}
              onSelectResource={(id) => (window.location.hash = `#/resources/${id}`)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
