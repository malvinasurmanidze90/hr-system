-- Add is_published flag to course_lessons.
-- Existing lessons default to published (true), so this is non-destructive.
ALTER TABLE course_lessons
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
