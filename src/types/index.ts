export type UserRole =
  | 'platform_super_admin'
  | 'tenant_super_admin'
  | 'super_admin'
  | 'ceo'
  | 'bu_head'
  | 'manager'
  | 'hr_admin'
  | 'employee';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';
export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type StepType = 'course' | 'document' | 'task' | 'acknowledgement' | 'meeting';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  industry?: string;
  size_range?: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessUnit {
  id: string;
  company_id: string;
  parent_id?: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id?: string;
  employee_id?: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role: UserRole;
  company_id?: string;
  business_unit_id?: string;
  tenant_id?: string;
  assigned_by?: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface UserBusinessUnit {
  id: string;
  user_id: string;
  business_unit_id: string;
  is_head: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  company_id: string;
  business_unit_id?: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
  difficulty: string;
  estimated_duration_minutes: number;
  status: ContentStatus;
  version: number;
  passing_score: number;
  certificate_enabled: boolean;
  created_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content?: string;
  lesson_type: string;
  file_url?: string;
  file_type?: string;
  video_url?: string;
  duration_minutes: number;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  lesson_id?: string;
  title: string;
  description?: string;
  passing_score: number;
  time_limit_minutes?: number;
  max_attempts: number;
  randomize_questions: boolean;
  show_results: boolean;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_type: QuestionType;
  options?: string[];
  correct_answer: string | string[];
  explanation?: string;
  points: number;
  sort_order: number;
  created_at: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  assigned_by?: string;
  enrolled_at: string;
  due_date?: string;
  status: EnrollmentStatus;
  completed_at?: string;
}

export interface LessonProgress {
  id: string;
  lesson_id: string;
  user_id: string;
  started_at?: string;
  completed_at?: string;
  time_spent_seconds: number;
  progress_percentage: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  attempt_number: number;
  started_at: string;
  completed_at?: string;
  score?: number;
  max_score?: number;
  passed?: boolean;
  answers: QuizAnswer[];
  time_spent_seconds?: number;
}

export interface QuizAnswer {
  question_id: string;
  answer: string | string[];
  is_correct?: boolean;
  points_earned?: number;
}

export interface OnboardingProgram {
  id: string;
  company_id: string;
  business_unit_id?: string;
  name: string;
  description?: string;
  target_role?: UserRole;
  duration_days: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStep {
  id: string;
  program_id: string;
  title: string;
  description?: string;
  step_type: StepType;
  reference_id?: string;
  sort_order: number;
  due_day?: number;
  is_required: boolean;
  assigned_to_role?: UserRole;
  created_at: string;
}

export interface EmployeeOnboarding {
  id: string;
  user_id: string;
  program_id: string;
  assigned_by?: string;
  start_date: string;
  expected_end_date?: string;
  completed_at?: string;
  status: OnboardingStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStepProgress {
  id: string;
  employee_onboarding_id: string;
  step_id: string;
  status: EnrollmentStatus;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

export interface Document {
  id: string;
  company_id: string;
  business_unit_id?: string;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size_bytes?: number;
  version: number;
  status: ContentStatus;
  requires_acknowledgement: boolean;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  company_id?: string;
  business_unit_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message?: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

// Extended / enriched types
export interface CourseWithDetails extends Course {
  lessons?: Lesson[];
  quizzes?: Quiz[];
  enrollment?: CourseEnrollment;
  lesson_count?: number;
  enrolled_count?: number;
}

export interface ProfileWithRoles extends Profile {
  roles?: UserRoleAssignment[];
  business_units?: BusinessUnit[];
  company?: Company;
}

export interface OnboardingWithProgress extends EmployeeOnboarding {
  program?: OnboardingProgram;
  steps?: (OnboardingStep & { progress?: OnboardingStepProgress })[];
  total_steps?: number;
  completed_steps?: number;
}

// Auth / session context
export interface UserContext {
  profile: Profile;
  roles: UserRoleAssignment[];
  primaryRole: UserRole;
  businessUnits: UserBusinessUnit[];
  company?: Company;
}

// API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
