-- Completion method for each lesson.
-- 'button'           → standard "Mark complete" button
-- 'control_question' → must answer a question correctly to advance
ALTER TABLE course_lessons
  ADD COLUMN IF NOT EXISTS completion_method TEXT NOT NULL DEFAULT 'button'
    CHECK (completion_method IN ('button', 'control_question')),
  ADD COLUMN IF NOT EXISTS control_question  TEXT,
  ADD COLUMN IF NOT EXISTS control_answer    TEXT;
