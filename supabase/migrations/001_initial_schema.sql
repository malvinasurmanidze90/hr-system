-- ============================================================
-- HR OS - Initial Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM (
  'super_admin', 'ceo', 'bu_head', 'manager', 'hr_admin', 'employee'
);
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE enrollment_status AS ENUM ('not_started', 'in_progress', 'completed', 'overdue');
CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE step_type AS ENUM ('course', 'document', 'task', 'acknowledgement', 'meeting');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');
CREATE TYPE file_type AS ENUM ('pdf', 'video', 'document', 'image', 'other');

-- ==========================================
-- COMPANIES
-- ==========================================
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  logo_url    TEXT,
  industry    TEXT,
  size_range  TEXT,
  settings    JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- BUSINESS UNITS
-- ==========================================
CREATE TABLE business_units (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES business_units(id),
  name        TEXT NOT NULL,
  code        TEXT,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PROFILES (extends auth.users)
-- ==========================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id),
  employee_id TEXT UNIQUE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  avatar_url  TEXT,
  phone       TEXT,
  position    TEXT,
  department  TEXT,
  hire_date   DATE,
  status      TEXT DEFAULT 'active',
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- USER ROLE ASSIGNMENTS
-- ==========================================
CREATE TABLE user_roles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role             user_role NOT NULL,
  company_id       UUID REFERENCES companies(id),
  business_unit_id UUID REFERENCES business_units(id),
  assigned_by      UUID REFERENCES profiles(id),
  assigned_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, role, company_id, business_unit_id)
);

-- ==========================================
-- USER BUSINESS UNIT MEMBERSHIP
-- ==========================================
CREATE TABLE user_business_units (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  is_head          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_unit_id)
);

-- ==========================================
-- COURSES
-- ==========================================
CREATE TABLE courses (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                 UUID NOT NULL REFERENCES companies(id),
  business_unit_id           UUID REFERENCES business_units(id),
  title                      TEXT NOT NULL,
  description                TEXT,
  thumbnail_url              TEXT,
  category                   TEXT,
  difficulty                 TEXT DEFAULT 'beginner',
  estimated_duration_minutes INTEGER DEFAULT 0,
  status                     content_status DEFAULT 'draft',
  version                    INTEGER DEFAULT 1,
  passing_score              INTEGER DEFAULT 70,
  certificate_enabled        BOOLEAN DEFAULT FALSE,
  created_by                 UUID REFERENCES profiles(id),
  published_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- LESSONS
-- ==========================================
CREATE TABLE lessons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  content          TEXT,
  lesson_type      TEXT DEFAULT 'text',
  file_url         TEXT,
  file_type        file_type,
  video_url        TEXT,
  duration_minutes INTEGER DEFAULT 0,
  sort_order       INTEGER DEFAULT 0,
  is_required      BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- QUIZZES
-- ==========================================
CREATE TABLE quizzes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id           UUID REFERENCES lessons(id),
  title               TEXT NOT NULL,
  description         TEXT,
  passing_score       INTEGER DEFAULT 70,
  time_limit_minutes  INTEGER,
  max_attempts        INTEGER DEFAULT 3,
  randomize_questions BOOLEAN DEFAULT FALSE,
  show_results        BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- QUIZ QUESTIONS
-- ==========================================
CREATE TABLE quiz_questions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id        UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question       TEXT NOT NULL,
  question_type  question_type DEFAULT 'multiple_choice',
  options        JSONB,
  correct_answer JSONB NOT NULL,
  explanation    TEXT,
  points         INTEGER DEFAULT 1,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- COURSE ENROLLMENTS
-- ==========================================
CREATE TABLE course_enrollments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by  UUID REFERENCES profiles(id),
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  due_date     TIMESTAMPTZ,
  status       enrollment_status DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, user_id)
);

-- ==========================================
-- LESSON PROGRESS
-- ==========================================
CREATE TABLE lesson_progress (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id           UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  time_spent_seconds  INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  UNIQUE(lesson_id, user_id)
);

-- ==========================================
-- QUIZ ATTEMPTS
-- ==========================================
CREATE TABLE quiz_attempts (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id            UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_number     INTEGER DEFAULT 1,
  started_at         TIMESTAMPTZ DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  score              NUMERIC(5,2),
  max_score          INTEGER,
  passed             BOOLEAN,
  answers            JSONB DEFAULT '[]',
  time_spent_seconds INTEGER
);

-- ==========================================
-- ONBOARDING PROGRAMS
-- ==========================================
CREATE TABLE onboarding_programs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id),
  business_unit_id UUID REFERENCES business_units(id),
  name             TEXT NOT NULL,
  description      TEXT,
  target_role      user_role,
  duration_days    INTEGER DEFAULT 30,
  is_active        BOOLEAN DEFAULT TRUE,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ONBOARDING STEPS
-- ==========================================
CREATE TABLE onboarding_steps (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id       UUID NOT NULL REFERENCES onboarding_programs(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  step_type        step_type DEFAULT 'task',
  reference_id     UUID,
  sort_order       INTEGER DEFAULT 0,
  due_day          INTEGER,
  is_required      BOOLEAN DEFAULT TRUE,
  assigned_to_role user_role,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- EMPLOYEE ONBOARDING
-- ==========================================
CREATE TABLE employee_onboarding (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id        UUID NOT NULL REFERENCES onboarding_programs(id),
  assigned_by       UUID REFERENCES profiles(id),
  start_date        DATE DEFAULT CURRENT_DATE,
  expected_end_date DATE,
  completed_at      TIMESTAMPTZ,
  status            onboarding_status DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ONBOARDING STEP PROGRESS
-- ==========================================
CREATE TABLE onboarding_step_progress (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_onboarding_id UUID NOT NULL REFERENCES employee_onboarding(id) ON DELETE CASCADE,
  step_id               UUID NOT NULL REFERENCES onboarding_steps(id),
  status                enrollment_status DEFAULT 'not_started',
  completed_at          TIMESTAMPTZ,
  completed_by          UUID REFERENCES profiles(id),
  notes                 TEXT,
  UNIQUE(employee_onboarding_id, step_id)
);

-- ==========================================
-- DOCUMENTS
-- ==========================================
CREATE TABLE documents (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id               UUID NOT NULL REFERENCES companies(id),
  business_unit_id         UUID REFERENCES business_units(id),
  title                    TEXT NOT NULL,
  description              TEXT,
  file_url                 TEXT NOT NULL,
  file_type                TEXT,
  file_size_bytes          BIGINT,
  version                  INTEGER DEFAULT 1,
  status                   content_status DEFAULT 'draft',
  requires_acknowledgement BOOLEAN DEFAULT FALSE,
  created_by               UUID REFERENCES profiles(id),
  approved_by              UUID REFERENCES profiles(id),
  approved_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- DOCUMENT VERSIONS
-- ==========================================
CREATE TABLE document_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  file_url        TEXT NOT NULL,
  changes_summary TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- DOCUMENT ACKNOWLEDGEMENTS
-- ==========================================
CREATE TABLE document_acknowledgements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address      TEXT,
  signature       TEXT,
  UNIQUE(document_id, user_id)
);

-- ==========================================
-- AUDIT LOGS (ISO 27001 / HR compliance)
-- ==========================================
CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES profiles(id),
  company_id       UUID REFERENCES companies(id),
  business_unit_id UUID REFERENCES business_units(id),
  action           TEXT NOT NULL,
  resource_type    TEXT NOT NULL,
  resource_id      UUID,
  old_data         JSONB,
  new_data         JSONB,
  ip_address       TEXT,
  user_agent       TEXT,
  session_id       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ACCESS LOGS
-- ==========================================
CREATE TABLE access_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES profiles(id),
  action        TEXT NOT NULL,
  resource      TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  success       BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- AI INTERACTIONS
-- ==========================================
CREATE TABLE ai_interactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  session_id  TEXT,
  prompt      TEXT NOT NULL,
  response    TEXT,
  context     TEXT,
  tokens_used INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- NOTIFICATIONS
-- ==========================================
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT,
  type       TEXT DEFAULT 'info',
  is_read    BOOLEAN DEFAULT FALSE,
  link       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_profiles_company      ON profiles(company_id);
CREATE INDEX idx_user_roles_user       ON user_roles(user_id);
CREATE INDEX idx_user_roles_company    ON user_roles(company_id);
CREATE INDEX idx_user_roles_bu         ON user_roles(business_unit_id);
CREATE INDEX idx_user_bus_user         ON user_business_units(user_id);
CREATE INDEX idx_user_bus_bu           ON user_business_units(business_unit_id);
CREATE INDEX idx_courses_company       ON courses(company_id);
CREATE INDEX idx_lessons_course        ON lessons(course_id);
CREATE INDEX idx_enrollments_user      ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course    ON course_enrollments(course_id);
CREATE INDEX idx_lesson_progress_user  ON lesson_progress(user_id);
CREATE INDEX idx_audit_logs_user       ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_company    ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_created    ON audit_logs(created_at DESC);
CREATE INDEX idx_notifications_user    ON notifications(user_id);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at      BEFORE UPDATE ON companies      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_business_units_updated_at BEFORE UPDATE ON business_units FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at       BEFORE UPDATE ON profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_courses_updated_at        BEFORE UPDATE ON courses        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lessons_updated_at        BEFORE UPDATE ON lessons        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role = 'super_admin'
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user has a specific role within a company
CREATE OR REPLACE FUNCTION has_company_role(p_user_id UUID, p_company_id UUID, p_roles user_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND role = ANY(p_roles)
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user has access to a business unit
CREATE OR REPLACE FUNCTION has_bu_access(p_user_id UUID, p_business_unit_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_super_admin(p_user_id) OR EXISTS (
    SELECT 1 FROM user_business_units
    WHERE user_id = p_user_id
      AND business_unit_id = p_business_unit_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
