-- ============================================================
-- Course Builder: Modules + Lessons
--
-- Adds a two-level content structure (module → lesson) that is
-- separate from the flat `lessons` table used for enrollee
-- progress tracking. This powers the Course Builder UI.
-- ============================================================

CREATE TABLE IF NOT EXISTS course_modules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id        UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  lesson_type      TEXT NOT NULL DEFAULT 'text',
  content          TEXT,
  video_url        TEXT,
  file_url         TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_required      BOOLEAN NOT NULL DEFAULT TRUE,
  duration_minutes INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

-- Authenticated users can access (development-safe policy)
CREATE POLICY "modules_auth"
  ON course_modules FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "c_lessons_auth"
  ON course_lessons FOR ALL
  USING (auth.uid() IS NOT NULL);
