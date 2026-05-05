-- ============================================================
-- Migration 005: Add slug column to companies for subdomain routing
-- ============================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug) WHERE slug IS NOT NULL;

-- Auto-generate slug for existing companies (lowercase, alphanumeric + hyphens)
UPDATE companies
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;
