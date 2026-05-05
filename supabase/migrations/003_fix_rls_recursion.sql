-- ============================================================
-- Fix RLS infinite recursion on course_enrollments
--
-- Root cause: policies on courses/lessons/quizzes queried
-- course_enrollments, while course_enrollments policies
-- queried courses — creating a cycle.
--
-- Fix: replace all cross-referencing enrollment checks with
-- simple company-membership or user_roles checks.
-- ============================================================

-- ── Step 1: Drop recursive policies ──────────────────────────────────

-- These queried course_enrollments from other tables:
DROP POLICY IF EXISTS "courses_enrolled_select"      ON courses;
DROP POLICY IF EXISTS "lessons_enrolled_select"      ON lessons;
DROP POLICY IF EXISTS "quizzes_enrolled"             ON quizzes;
DROP POLICY IF EXISTS "quiz_questions_enrolled"      ON quiz_questions;

-- Drop existing course_enrollments policies (all of them):
DROP POLICY IF EXISTS "enrollments_super_admin"      ON course_enrollments;
DROP POLICY IF EXISTS "enrollments_self_select"      ON course_enrollments;
DROP POLICY IF EXISTS "enrollments_hr_manage"        ON course_enrollments;

-- ── Step 2: Non-recursive course_enrollments policies ─────────────────

-- Users see and manage their own enrollment rows
CREATE POLICY "enrollments_self"
  ON course_enrollments FOR ALL
  USING (user_id = auth.uid());

-- Admins/managers access via user_roles only — no subquery into course_enrollments
CREATE POLICY "enrollments_staff_manage"
  ON course_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE  ur.user_id   = auth.uid()
        AND  ur.role IN ('super_admin','hr_admin','ceo','bu_head','manager')
        AND  ur.is_active = TRUE
    )
  );

-- ── Step 3: Replace courses select with company-membership check ──────
--
-- Previous policy queried course_enrollments → caused recursion.
-- New policy: any member of the same company can see courses.
-- (RLS on profiles is non-recursive so this is safe.)

CREATE POLICY "courses_company_select"
  ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE  p.id         = auth.uid()
        AND  p.company_id = courses.company_id
    )
  );

-- ── Step 4: Replace lessons select ────────────────────────────────────

CREATE POLICY "lessons_company_select"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses   c
      JOIN         profiles   p ON p.id = auth.uid()
      WHERE  c.id         = lessons.course_id
        AND  p.company_id = c.company_id
    )
  );

-- ── Step 5: Replace quizzes select ────────────────────────────────────

CREATE POLICY "quizzes_company_select"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses   c
      JOIN         profiles   p ON p.id = auth.uid()
      WHERE  c.id         = quizzes.course_id
        AND  p.company_id = c.company_id
    )
  );

-- ── Step 6: Replace quiz_questions select ─────────────────────────────

CREATE POLICY "quiz_questions_company_select"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes   q
      JOIN         courses    c ON c.id = q.course_id
      JOIN         profiles   p ON p.id = auth.uid()
      WHERE  q.id         = quiz_questions.quiz_id
        AND  p.company_id = c.company_id
    )
  );
