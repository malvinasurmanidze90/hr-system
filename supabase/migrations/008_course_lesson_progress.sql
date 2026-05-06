-- ============================================================
-- Course Lesson Progress + Enrollment Self-Update
-- ============================================================

-- Progress percentage on enrollments (for live tracking)
ALTER TABLE course_enrollments
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER NOT NULL DEFAULT 0;

-- Allow enrolled users to update their own progress/status fields
CREATE POLICY "enrollments_self_update"
  ON course_enrollments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Track completion of individual course_lessons per user
-- ============================================================
CREATE TABLE IF NOT EXISTS course_lesson_progress (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id    UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id)       ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_id, user_id)
);

ALTER TABLE course_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Users manage their own rows
CREATE POLICY "clp_self_all"
  ON course_lesson_progress FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Managers / HR can read any row
CREATE POLICY "clp_mgr_select"
  ON course_lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE  ur.user_id   = auth.uid()
        AND  ur.role      IN ('manager','bu_head','hr_admin','ceo','super_admin','tenant_super_admin','platform_super_admin')
        AND  ur.is_active = TRUE
    )
  );
