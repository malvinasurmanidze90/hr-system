-- ============================================================
-- HR OS - Sample Data Seed
-- Run this after migrations and after creating test users in Supabase Auth
-- ============================================================

-- Sample Companies
INSERT INTO companies (id, name, industry, size_range) VALUES
  ('11111111-0000-0000-0000-000000000001', 'TechCorp Global', 'Technology', '500-1000'),
  ('11111111-0000-0000-0000-000000000002', 'RetailPro Inc', 'Retail', '100-500');

-- Sample Business Units
INSERT INTO business_units (id, company_id, name, code, description) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Engineering', 'ENG', 'Software Engineering Department'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Product', 'PRD', 'Product Management'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'HR & Operations', 'HRO', 'Human Resources and Operations'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'Sales', 'SAL', 'Sales Team'),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'Customer Success', 'CS', 'Customer Success Team');

-- Sample Courses (requires profiles to exist — create users in Supabase Auth first)
-- After creating a super admin user, replace the UUID below with the actual user ID
-- INSERT INTO courses (id, company_id, business_unit_id, title, description, category, difficulty, estimated_duration_minutes, status, passing_score)
-- VALUES
--   ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
--    'Security & Compliance Fundamentals', 'Learn the basics of information security and compliance requirements.', 'Compliance', 'beginner', 45, 'published', 80),
--   ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', NULL,
--    'New Employee Orientation', 'Welcome to TechCorp! Learn about our culture, values, and processes.', 'Onboarding', 'beginner', 60, 'published', 70),
--   ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
--    'Code Review Best Practices', 'How to give and receive effective code reviews.', 'Engineering', 'intermediate', 30, 'published', 75);

-- Sample Onboarding Program (uncomment after creating courses above)
-- INSERT INTO onboarding_programs (id, company_id, name, description, target_role, duration_days)
-- VALUES
--   ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
--    'New Employee Onboarding - Engineering', 'Standard onboarding program for new engineers', 'employee', 30);

-- INSERT INTO onboarding_steps (program_id, title, description, step_type, sort_order, due_day, is_required) VALUES
--   ('44444444-0000-0000-0000-000000000001', 'Complete New Employee Orientation Course', 'Take the orientation course and pass the quiz', 'course', 1, 1, true),
--   ('44444444-0000-0000-0000-000000000001', 'Review Employee Handbook', 'Read and acknowledge the employee handbook', 'document', 2, 3, true),
--   ('44444444-0000-0000-0000-000000000001', 'Meet with your Manager', 'Schedule and complete 1:1 with your manager', 'meeting', 3, 5, true),
--   ('44444444-0000-0000-0000-000000000001', 'Complete Security Training', 'Complete the Security & Compliance Fundamentals course', 'course', 4, 14, true),
--   ('44444444-0000-0000-0000-000000000001', 'Set up development environment', 'Install required tools and get dev environment running', 'task', 5, 3, true);

-- Setup instructions:
-- 1. Run migrations (001_initial_schema.sql, 002_rls_policies.sql)
-- 2. Create the following test users in Supabase Auth dashboard:
--    - super.admin@techcorp.com (password: Admin1234!)
--    - ceo@techcorp.com         (password: Admin1234!)
--    - hr.admin@techcorp.com    (password: Admin1234!)
--    - manager@techcorp.com     (password: Admin1234!)
--    - employee@techcorp.com    (password: Admin1234!)
-- 3. After users are created, update their profiles with company_id
-- 4. Assign roles via the user_roles table
-- 5. Uncomment and run the course/onboarding seed data above
