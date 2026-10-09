export type UserRole = 'ADMIN' | 'TEACHER' | 'SUBJECT_LEADER' | 'VICE_SUBJECT_LEADER' | 'SCHOOL_ADMIN' | 'VICE_PRINCIPAL';

export type UserStatus = 'active' | 'inactive' | 'locked';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  created_at: string;
  updated_at: string;
  leader?: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
  member_count?: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  department_id?: string | null;
  created_at: string;
  department?: {
    id: string;
    name: string;
  } | null;
  resource_count?: number;
  teacher_count?: number;
}

export interface Grade {
  id: string;
  name: string;
  created_at: string;
  resource_count?: number;
  level?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  department_id: string | null;
  subject_id: string | null;
  role: UserRole;
  status: UserStatus;
  password?: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
  subject?: Subject | null;
}

export type ResourceStatus =
  | 'draft'
  | 'submitted'
  | 'subject_leader_approved'
  | 'pending_school_approval'
  | 'approved'
  | 'rejected'
  | 'rejected_by_subject_leader'
  | 'rejected_by_school'
  | 'revision_required'
  | 'archived';

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  resource_count?: number;
}

export type ApprovalActionType =
  | 'submit'
  | 'subject_leader_approve'
  | 'subject_leader_reject'
  | 'school_approve'
  | 'school_reject'
  | 'request_revision'
  | 'resubmit'
  | 'archive';

export interface ApprovalHistory {
  id: string;
  resource_id: string;
  actor_id: string;
  action: ApprovalActionType;
  previous_status: ResourceStatus;
  new_status: ResourceStatus;
  comment: string | null;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    role: UserRole;
  } | null;
}

export interface ResourceType {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  resource_count?: number;
}

export interface Resource {
  id: string;
  public_token?: string; // QR Code public token: unique, unguessable, indexed
  title: string;
  description: string | null;
  owner_id: string;
  teacher_id?: string; // alias for owner_id for seamless compatibility
  department_id: string | null;
  subject_id: string | null;
  grade_id: string | null;
  class_name: string | null;
  school_year: string | null;
  academic_year_id?: string | null;
  topic: string | null;
  resource_type: string;
  resource_url: string;
  file_name: string | null;
  file_extension: string | null;
  file_size: number | null;
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  subject_leader_reviewed_at?: string | null;
  subject_leader_reviewed_by?: string | null;
  school_reviewed_at?: string | null;
  school_reviewed_by?: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  archived_at?: string | null;
  archived_by?: string | null;

  // Source & Sync metadata (Google Form / Sheets / API)
  source_type?: 'manual' | 'google_form' | 'google_drive' | 'api' | null;
  google_form_submission_id?: string | null;
  google_drive_file_id?: string | null;
  source_metadata?: Record<string, any> | null;
  synced_at?: string | null;

  // Joined metadata
  owner?: {
    id: string;
    full_name: string;
    email: string | null;
    role: UserRole;
  } | null;
  department?: Department | null;
  subject?: Subject | null;
  grade?: Grade | null;
  approver?: {
    id: string;
    full_name: string;
  } | null;
}

export type ResourceProvider =
  | 'google_drive'
  | 'google_docs'
  | 'google_slides'
  | 'google_sheets'
  | 'youtube'
  | 'canva'
  | 'onedrive'
  | 'dropbox'
  | 'website'
  | 'unknown';

// ==============================================================================
// NOTIFICATIONS MODULE TYPES (PHẦN II)
// ==============================================================================

export type NotificationType =
  | 'RESOURCE_SUBMITTED'
  | 'RESOURCE_SUBJECT_LEADER_APPROVED'
  | 'RESOURCE_SUBJECT_LEADER_REVISION'
  | 'RESOURCE_SUBJECT_LEADER_REJECTED'
  | 'RESOURCE_PENDING_SCHOOL_APPROVAL'
  | 'RESOURCE_SCHOOL_APPROVED'
  | 'RESOURCE_SCHOOL_REVISION'
  | 'RESOURCE_SCHOOL_REJECTED'
  | 'RESOURCE_UPDATED'
  | 'RESOURCE_ARCHIVED'
  | 'SYSTEM_NOTIFICATION';

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id: string;
  resource_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, any> | null;
  actor?: {
    id: string;
    full_name: string;
    role: UserRole;
    avatar_url?: string | null;
  } | null;
  resource?: {
    id: string;
    title: string;
    status?: ResourceStatus;
  } | null;
}

// ==============================================================================
// ACTIVITY LOGS MODULE TYPES (PHẦN III)
// ==============================================================================

export type ActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SUBMIT'
  | 'APPROVE'
  | 'REQUEST_REVISION'
  | 'REJECT'
  | 'ARCHIVE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'CREATE_QR'
  | 'DOWNLOAD_QR'
  | 'PRINT_QR'
  | 'SAVE_SEARCH'
  | 'VIEW_RESOURCE'
  | 'COPY_RESOURCE_LINK'
  | 'PASSWORD_RESET'
  // Backward compatibility aliases
  | 'PROFILE_UPDATE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'ROLE_CHANGE'
  | 'STATUS_CHANGE'
  | 'CREATE_RESOURCE'
  | 'UPDATE_RESOURCE'
  | 'DELETE_RESOURCE'
  | 'ARCHIVE_RESOURCE'
  | 'SUBMIT_RESOURCE'
  | 'RESOURCE_IMPORTED_FROM_GOOGLE_FORM';

export interface ActivityLog {
  id: string;
  user_id: string; // compatibility alias
  actor_id?: string;
  action: ActivityAction;
  entity_type: 'RESOURCE' | 'USER' | 'NOTIFICATION' | 'SEARCH' | 'SYSTEM' | string;
  entity_id: string | null;
  description?: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  user?: {
    id?: string;
    full_name: string;
    email: string | null;
    role: UserRole;
  } | null;
  actor?: {
    id?: string;
    full_name: string;
    email: string | null;
    role: UserRole;
  } | null;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token?: string;
}

export interface RoleInfo {
  label: string;
  badgeClass: string;
  description: string;
}

export type ResourceSortOption =
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'created_at_desc'
  | 'created_at_asc'
  | 'title_asc'
  | 'title_desc'
  | 'approved_at_desc'
  | 'approved_at_asc';

export interface ResourceFilterParams {
  search?: string;
  q?: string;
  department_id?: string;
  departments?: string[];
  subject_id?: string;
  subjects?: string[];
  grade_id?: string;
  grades?: string[];
  class_name?: string;
  school_year?: string;
  resource_type?: string;
  resource_types?: string[];
  owner_id?: string;
  teacher_id?: string;
  status?: ResourceStatus | 'all';
  statuses?: ResourceStatus[];
  source_type?: 'manual' | 'google_form' | 'google_drive' | 'api' | 'all';
  sortBy?: ResourceSortOption;
  page?: number;
  pageSize?: number;
  // Date filtering
  date_filter_type?: 'updated_at' | 'created_at' | 'approved_at';
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  // Options
  only_approved?: boolean;
  search_in_url?: boolean;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters_json: ResourceFilterParams;
  created_at: string;
  updated_at: string;
}


// ==============================================================================
// DASHBOARD & STATISTICS TYPES
// ==============================================================================

export type DashboardTimeRange =
  | 'today'
  | '7days'
  | '30days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | '6months'
  | 'this_year'
  | 'academic_year'
  | 'custom';

export interface DashboardFilterParams {
  timeRange: DashboardTimeRange;
  startDate?: string;
  endDate?: string;
  academicYear?: string;
  departmentId?: string;
  teacherId?: string;
  subjectId?: string;
  gradeId?: string;
  resourceType?: string;
  status?: string;
}

export interface DashboardKPIData {
  total: number;
  approved: number;
  pendingSubjectLeader: number;
  pendingSchool: number;
  revisionRequired: number;
  rejected: number;
  draft: number;
  createdThisMonth: number;
  approvedThisMonth: number;
  totalTeachers?: number;
  totalDepartments?: number;
}

export interface DashboardStatusDistributionItem {
  status: ResourceStatus;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DashboardTimelinePoint {
  date: string;
  label: string;
  created: number;
  approved: number;
}

export interface DashboardDepartmentStat {
  id: string;
  name: string;
  total: number;
  approved: number;
  pendingSchool: number;
  pendingSubjectLeader: number;
  revision: number;
}

export interface DashboardSubjectStat {
  id: string;
  name: string;
  total: number;
  approved: number;
  pending: number;
}

export interface DashboardGradeStat {
  id: string;
  name: string;
  total: number;
  approved: number;
}

export interface DashboardResourceTypeStat {
  name: string;
  total: number;
  approved: number;
}

export interface DashboardTeacherStat {
  id: string;
  name: string;
  email: string | null;
  departmentName: string;
  total: number;
  approved: number;
  pending: number;
}

export interface ApprovalProcessingTimes {
  avgSubjectLeaderHours: number | null;
  avgSchoolHours: number | null;
  avgTotalHours: number | null;
  completedCount: number;
  processingCount: number;
  hasEnoughData: boolean;
}

export interface DashboardActivityItem {
  id: string;
  userName: string;
  userRole: UserRole;
  actionText: string;
  resourceTitle: string;
  resourceId?: string;
  statusBadge?: { label: string; badgeClass: string };
  time: string;
  timestamp: string;
}

export interface DashboardData {
  kpis: DashboardKPIData;
  statusDistribution: DashboardStatusDistributionItem[];
  timeline: DashboardTimelinePoint[];
  departmentStats: DashboardDepartmentStat[];
  subjectStats: DashboardSubjectStat[];
  gradeStats: DashboardGradeStat[];
  resourceTypeStats: DashboardResourceTypeStat[];
  teacherStats: DashboardTeacherStat[];
  processingTimes: ApprovalProcessingTimes;
  pendingActions: Resource[];
  recentActivities: DashboardActivityItem[];
}

export type DashboardKPIs = DashboardKPIData;
export type ResourceStatusDistribution = DashboardStatusDistributionItem;
export type DepartmentStats = DashboardDepartmentStat;
export type SubjectStats = DashboardSubjectStat;
export type GradeStats = DashboardGradeStat;
export type ResourceTypeStats = DashboardResourceTypeStat;
export type TeacherStats = DashboardTeacherStat;
export type RecentActivityItem = DashboardActivityItem;

export interface GoogleDriveConfig {
  folder_name: string;
  folder_url: string;
  instructions: string;
  allow_teacher_upload: boolean;
  subject_folders?: Record<string, string>; // subject_id -> google drive folder url
  updated_at?: string;
  updated_by?: string;
}

// ==============================================================================
// GOOGLE FORM RESOURCE INTEGRATION TYPES
// ==============================================================================

export interface GoogleFormConfig {
  form_url: string;
  form_id: string;
  sheet_url: string;
  sheet_id: string;
  is_active: boolean;
  default_status: 'submitted' | 'draft';
  instructions: string;
  webhook_url: string;
  last_synced_at: string | null;
  updated_at?: string;
  updated_by?: string;
}

export interface GoogleFormSubmissionPayload {
  submission_id: string;
  submitted_at: string;
  teacher_email: string;
  teacher_name?: string;
  department?: string;
  subject?: string;
  grade?: string;
  title: string;
  description?: string;
  resource_type?: string;
  topic?: string;
  academic_year?: string;
  resource_url?: string;
  drive_file_id?: string;
  keywords?: string;
  [key: string]: any;
}

export type SyncLogStatus = 'synced' | 'duplicate' | 'failed' | 'invalid' | 'pending';

export interface ResourceSyncLog {
  id: string;
  submission_id: string;
  resource_id: string | null;
  status: SyncLogStatus;
  error_message: string | null;
  payload_hash?: string | null;
  teacher_email?: string | null;
  resource_title?: string | null;
  source: 'google_form' | 'google_sheet' | 'api';
  created_at: string;
  processed_at: string;
}

export interface GoogleFormSyncStats {
  total: number;
  synced: number;
  pending: number;
  failed: number;
  duplicate: number;
}


