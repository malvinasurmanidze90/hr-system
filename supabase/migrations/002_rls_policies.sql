-- ============================================================
-- HR OS - Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_units             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_units        ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_programs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_onboarding        ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_step_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- COMPANIES
-- ==========================================
CREATE POLICY "companies_super_admin" ON companies FOR ALL USING (is_super_admin());
CREATE POLICY "companies_member_select" ON companies FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id = companies.id)
);
CREATE POLICY "companies_hr_admin_update" ON companies FOR UPDATE USING (
  has_company_role(auth.uid(), id, ARRAY['hr_admin']::user_role[])
);

-- ==========================================
-- BUSINESS UNITS
-- ==========================================
CREATE POLICY "bu_super_admin" ON business_units FOR ALL USING (is_super_admin());
CREATE POLICY "bu_hr_admin_manage" ON business_units FOR ALL USING (
  has_company_role(auth.uid(), business_units.company_id, ARRAY['hr_admin']::user_role[])
);
CREATE POLICY "bu_member_select" ON business_units FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id = business_units.company_id)
);

-- ==========================================
-- PROFILES
-- ==========================================
CREATE POLICY "profiles_super_admin" ON profiles FOR ALL USING (is_super_admin());
CREATE POLICY "profiles_self_select"  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_self_update"  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_hr_ceo_manage" ON profiles FOR ALL USING (
  has_company_role(auth.uid(), profiles.company_id, ARRAY['hr_admin', 'ceo']::user_role[])
);
-- Managers/BU heads can view team members in their shared BUs
CREATE POLICY "profiles_manager_select" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('manager', 'bu_head')
      AND ur.is_active = TRUE
  ) AND EXISTS (
    SELECT 1 FROM user_business_units a
    JOIN   user_business_units b ON a.business_unit_id = b.business_unit_id
    WHERE  a.user_id = auth.uid()
      AND  b.user_id = profiles.id
  )
);

-- ==========================================
-- USER ROLES
-- ==========================================
CREATE POLICY "user_roles_super_admin"   ON user_roles FOR ALL USING (is_super_admin());
CREATE POLICY "user_roles_hr_manage"     ON user_roles FOR ALL USING (
  has_company_role(auth.uid(), user_roles.company_id, ARRAY['hr_admin']::user_role[])
);
CREATE POLICY "user_roles_self_select"   ON user_roles FOR SELECT USING (user_id = auth.uid());

-- ==========================================
-- USER BUSINESS UNITS
-- ==========================================
CREATE POLICY "ubu_super_admin"   ON user_business_units FOR ALL USING (is_super_admin());
CREATE POLICY "ubu_hr_manage"     ON user_business_units FOR ALL USING (
  EXISTS (
    SELECT 1 FROM business_units bu
    JOIN   profiles p ON p.id = auth.uid()
    WHERE  bu.id = user_business_units.business_unit_id
      AND  has_company_role(auth.uid(), bu.company_id, ARRAY['hr_admin']::user_role[])
  )
);
CREATE POLICY "ubu_self_select"   ON user_business_units FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ubu_bu_head_select" ON user_business_units FOR SELECT USING (
  has_bu_access(auth.uid(), user_business_units.business_unit_id)
);

-- ==========================================
-- COURSES
-- ==========================================
CREATE POLICY "courses_super_admin" ON courses FOR ALL USING (is_super_admin());
CREATE POLICY "courses_hr_manage"   ON courses FOR ALL USING (
  has_company_role(auth.uid(), courses.company_id, ARRAY['hr_admin']::user_role[])
);
-- CEO, BU Head, Manager can view all courses in their company
CREATE POLICY "courses_leadership_select" ON courses FOR SELECT USING (
  courses.status = 'published' AND
  has_company_role(auth.uid(), courses.company_id, ARRAY['ceo', 'bu_head', 'manager']::user_role[])
);
-- Enrolled employees can view published courses
CREATE POLICY "courses_enrolled_select" ON courses FOR SELECT USING (
  courses.status = 'published' AND
  EXISTS (SELECT 1 FROM course_enrollments WHERE course_id = courses.id AND user_id = auth.uid())
);

-- ==========================================
-- LESSONS
-- ==========================================
CREATE POLICY "lessons_super_admin" ON lessons FOR ALL USING (is_super_admin());
CREATE POLICY "lessons_hr_manage"   ON lessons FOR ALL USING (
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = lessons.course_id
      AND has_company_role(auth.uid(), c.company_id, ARRAY['hr_admin']::user_role[])
  )
);
CREATE POLICY "lessons_enrolled_select" ON lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = lessons.course_id AND (
      is_super_admin() OR
      has_company_role(auth.uid(), c.company_id, ARRAY['hr_admin', 'ceo', 'bu_head', 'manager']::user_role[]) OR
      EXISTS (SELECT 1 FROM course_enrollments WHERE course_id = c.id AND user_id = auth.uid())
    )
  )
);

-- ==========================================
-- QUIZZES & QUESTIONS
-- ==========================================
CREATE POLICY "quizzes_super_admin"  ON quizzes FOR ALL USING (is_super_admin());
CREATE POLICY "quizzes_hr_manage"    ON quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND has_company_role(auth.uid(), c.company_id, ARRAY['hr_admin']::user_role[]))
);
CREATE POLICY "quizzes_enrolled"     ON quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND (
    has_company_role(auth.uid(), c.company_id, ARRAY['hr_admin','ceo','bu_head','manager']::user_role[]) OR
    EXISTS (SELECT 1 FROM course_enrollments WHERE course_id = c.id AND user_id = auth.uid())
  ))
);
CREATE POLICY "quiz_questions_super_admin" ON quiz_questions FOR ALL USING (is_super_admin());
CREATE POLICY "quiz_questions_hr_manage"   ON quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND has_company_role(auth.uid(), c.company_id, ARRAY['hr_admin']::user_role[]))
);
CREATE POLICY "quiz_questions_enrolled"    ON quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND (
    has_company_role(auth.uid(), c.company_id, ARRAY['hr_admin','ceo','bu_head','manager']::user_role[]) OR
    EXISTS (SELECT 1 FROM course_enrollments WHERE course_id = c.id AND user_id = auth.uid())
  ))
);

-- ==========================================
-- COURSE ENROLLMENTS
-- ==========================================
CREATE POLICY "enrollments_super_admin"  ON course_enrollments FOR ALL USING (is_super_admin());
CREATE POLICY "enrollments_self_select"  ON course_enrollments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "enrollments_hr_manage"    ON course_enrollments FOR ALL USING (
  EXISTS (SELECT 1 FROM courses c WHERE c.id = course_enrollments.course_id AND has_company_role(auth.uid(), c.company_id, ARRAY['hr_admin', 'manager', 'bu_head']::user_role[]))
);

-- ==========================================
-- LESSON PROGRESS
-- ==========================================
CREATE POLICY "lesson_progress_self"    ON lesson_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "lesson_progress_mgr"     ON lesson_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('manager','bu_head','hr_admin','ceo','super_admin') AND ur.is_active = TRUE)
);

-- ==========================================
-- QUIZ ATTEMPTS
-- ==========================================
CREATE POLICY "quiz_attempts_self"  ON quiz_attempts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "quiz_attempts_mgr"   ON quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('manager','bu_head','hr_admin','ceo','super_admin') AND ur.is_active = TRUE)
);

-- ==========================================
-- ONBOARDING PROGRAMS
-- ==========================================
CREATE POLICY "ob_programs_super_admin" ON onboarding_programs FOR ALL USING (is_super_admin());
CREATE POLICY "ob_programs_hr_manage"   ON onboarding_programs FOR ALL USING (
  has_company_role(auth.uid(), onboarding_programs.company_id, ARRAY['hr_admin']::user_role[])
);
CREATE POLICY "ob_programs_staff_select" ON onboarding_programs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id = onboarding_programs.company_id)
);

-- ==========================================
-- ONBOARDING STEPS
-- ==========================================
CREATE POLICY "ob_steps_super_admin" ON onboarding_steps FOR ALL USING (is_super_admin());
CREATE POLICY "ob_steps_hr_manage"   ON onboarding_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM onboarding_programs op WHERE op.id = onboarding_steps.program_id AND has_company_role(auth.uid(), op.company_id, ARRAY['hr_admin']::user_role[]))
);
CREATE POLICY "ob_steps_staff_select" ON onboarding_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM onboarding_programs op JOIN profiles p ON p.id = auth.uid() WHERE op.id = onboarding_steps.program_id AND p.company_id = op.company_id)
);

-- ==========================================
-- EMPLOYEE ONBOARDING
-- ==========================================
CREATE POLICY "emp_ob_super_admin"   ON employee_onboarding FOR ALL USING (is_super_admin());
CREATE POLICY "emp_ob_self_select"   ON employee_onboarding FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "emp_ob_hr_manage"     ON employee_onboarding FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN   profiles p ON p.id = employee_onboarding.user_id
    WHERE  ur.user_id = auth.uid()
      AND  ur.company_id = p.company_id
      AND  ur.role IN ('hr_admin', 'manager', 'bu_head', 'ceo')
      AND  ur.is_active = TRUE
  )
);

-- ==========================================
-- ONBOARDING STEP PROGRESS
-- ==========================================
CREATE POLICY "ob_step_prog_super_admin" ON onboarding_step_progress FOR ALL USING (is_super_admin());
CREATE POLICY "ob_step_prog_self"        ON onboarding_step_progress FOR ALL USING (
  EXISTS (SELECT 1 FROM employee_onboarding eo WHERE eo.id = onboarding_step_progress.employee_onboarding_id AND eo.user_id = auth.uid())
);
CREATE POLICY "ob_step_prog_mgr"         ON onboarding_step_progress FOR ALL USING (
  EXISTS (
    SELECT 1 FROM employee_onboarding eo
    JOIN   user_roles ur ON ur.user_id = auth.uid()
    JOIN   profiles p ON p.id = eo.user_id
    WHERE  eo.id = onboarding_step_progress.employee_onboarding_id
      AND  ur.company_id = p.company_id
      AND  ur.role IN ('hr_admin','manager','bu_head','ceo')
      AND  ur.is_active = TRUE
  )
);

-- ==========================================
-- DOCUMENTS
-- ==========================================
CREATE POLICY "docs_super_admin"      ON documents FOR ALL USING (is_super_admin());
CREATE POLICY "docs_hr_manage"        ON documents FOR ALL USING (
  has_company_role(auth.uid(), documents.company_id, ARRAY['hr_admin']::user_role[])
);
CREATE POLICY "docs_published_select" ON documents FOR SELECT USING (
  documents.status = 'published' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id = documents.company_id)
);

-- ==========================================
-- DOCUMENT VERSIONS & ACKNOWLEDGEMENTS
-- ==========================================
CREATE POLICY "doc_versions_super_admin" ON document_versions FOR ALL USING (is_super_admin());
CREATE POLICY "doc_versions_hr"          ON document_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_versions.document_id AND has_company_role(auth.uid(), d.company_id, ARRAY['hr_admin']::user_role[]))
);
CREATE POLICY "doc_versions_member"      ON document_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM documents d JOIN profiles p ON p.id = auth.uid() WHERE d.id = document_versions.document_id AND p.company_id = d.company_id)
);
CREATE POLICY "doc_ack_self"  ON document_acknowledgements FOR ALL USING (user_id = auth.uid());
CREATE POLICY "doc_ack_hr"    ON document_acknowledgements FOR SELECT USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_acknowledgements.document_id AND has_company_role(auth.uid(), d.company_id, ARRAY['hr_admin','ceo']::user_role[]))
);

-- ==========================================
-- AUDIT LOGS (write-only for service role; read for admins)
-- ==========================================
CREATE POLICY "audit_super_admin_all"  ON audit_logs FOR ALL    USING (is_super_admin());
CREATE POLICY "audit_hr_ceo_select"    ON audit_logs FOR SELECT USING (
  has_company_role(auth.uid(), audit_logs.company_id, ARRAY['hr_admin','ceo']::user_role[])
);
CREATE POLICY "audit_insert_any"       ON audit_logs FOR INSERT WITH CHECK (TRUE);

-- ==========================================
-- ACCESS LOGS
-- ==========================================
CREATE POLICY "access_logs_super_admin" ON access_logs FOR ALL    USING (is_super_admin());
CREATE POLICY "access_logs_insert"      ON access_logs FOR INSERT WITH CHECK (TRUE);

-- ==========================================
-- AI INTERACTIONS
-- ==========================================
CREATE POLICY "ai_self_all" ON ai_interactions FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- NOTIFICATIONS
-- ==========================================
CREATE POLICY "notifications_self_all" ON notifications FOR ALL USING (user_id = auth.uid());
