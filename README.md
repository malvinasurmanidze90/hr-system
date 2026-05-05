# HR OS — ISO-Ready AI HR Operating System

A production-ready, multi-tenant HR platform with LMS, Onboarding, RBAC, and an AI assistant powered by Claude.

---

## Features

- **Multi-company / Multi-business-unit** architecture
- **6 role types** with full RLS enforcement: Super Admin, CEO, BU Head, Manager, HR Admin, Employee
- **LMS** — Course Builder, Lesson Builder (text, video, PDF), Quiz Builder
- **Onboarding** — Program management with step tracking per employee
- **AI Assistant** — Powered by Anthropic Claude (quiz generation, content writing, summarization)
- **ISO-ready** — Audit logs, access logs, document versioning, approval workflows
- **File uploads** via Supabase Storage
- **Mobile-friendly** responsive UI

---

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Frontend   | Next.js 14 (App Router) |
| Backend    | Next.js API Routes      |
| Database   | PostgreSQL (Supabase)   |
| Auth       | Supabase Auth           |
| Storage    | Supabase Storage        |
| AI         | Anthropic Claude API    |
| Styling    | Tailwind CSS            |
| Language   | TypeScript              |

---

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- An [Anthropic](https://console.anthropic.com) API key

### 2. Install Dependencies

```bash
cd hr-os
npm install
```

### 3. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to initialize

### 4. Run Database Migrations

In Supabase dashboard → **SQL Editor**, run in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

### 5. Configure Storage

In Supabase dashboard → **Storage**:
1. Create a bucket named `documents` (public)
2. Create a bucket named `videos` (public)
3. Create a bucket named `avatars` (public)

### 6. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Find Supabase keys at: Project Settings → API

### 7. Create Initial Users

In Supabase dashboard → **Authentication** → **Users**, create:

| Email                        | Password     |
|------------------------------|--------------|
| super.admin@techcorp.com     | Admin1234!   |
| ceo@techcorp.com             | Admin1234!   |
| hr.admin@techcorp.com        | Admin1234!   |
| manager@techcorp.com         | Admin1234!   |
| employee@techcorp.com        | Admin1234!   |

### 8. Seed Sample Data

In Supabase SQL Editor, run `supabase/seed.sql`.

After running, assign roles via SQL:

```sql
-- First, get user IDs from auth.users or profiles table
-- Then assign the super_admin role:
INSERT INTO user_roles (user_id, role, company_id, assigned_by)
SELECT p.id, 'super_admin', c.id, p.id
FROM profiles p, companies c
WHERE p.email = 'super.admin@techcorp.com'
  AND c.name = 'TechCorp Global'
LIMIT 1;

-- Assign HR Admin:
INSERT INTO user_roles (user_id, role, company_id, assigned_by)
SELECT p.id, 'hr_admin', c.id, (SELECT id FROM profiles WHERE email = 'super.admin@techcorp.com' LIMIT 1)
FROM profiles p, companies c
WHERE p.email = 'hr.admin@techcorp.com'
  AND c.name = 'TechCorp Global'
LIMIT 1;
```

### 9. Update Profile Company Assignments

```sql
UPDATE profiles SET company_id = (SELECT id FROM companies WHERE name = 'TechCorp Global')
WHERE email IN ('super.admin@techcorp.com', 'hr.admin@techcorp.com', 'manager@techcorp.com', 'employee@techcorp.com');

UPDATE profiles SET company_id = (SELECT id FROM companies WHERE name = 'TechCorp Global')
WHERE email = 'ceo@techcorp.com';
```

### 10. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
hr-os/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login page
│   │   ├── (dashboard)/         # All dashboard pages
│   │   │   ├── page.tsx         # Main dashboard
│   │   │   ├── admin/           # Company, BU, User management
│   │   │   ├── lms/             # Courses, Lessons, Onboarding
│   │   │   ├── portal/          # Employee learning portal
│   │   │   ├── reports/         # Analytics & reports
│   │   │   └── ai/              # AI assistant
│   │   └── api/                 # API routes
│   │       ├── admin/users/     # User creation (service role)
│   │       ├── ai/chat/         # Claude AI endpoint
│   │       ├── audit/           # Audit log reader
│   │       └── upload/          # File upload handler
│   ├── components/
│   │   ├── ui/                  # Reusable UI components
│   │   ├── layout/              # Sidebar, Header, StatsCard
│   │   └── ...
│   ├── lib/
│   │   ├── supabase/            # Client & server Supabase clients
│   │   ├── auth/permissions.ts  # RBAC permission helpers
│   │   ├── audit.ts             # Audit logging utility
│   │   └── utils.ts             # General utilities
│   ├── middleware.ts             # Auth route protection
│   └── types/index.ts           # TypeScript types
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # All tables, indexes, functions
│   │   └── 002_rls_policies.sql     # Row Level Security policies
│   └── seed.sql                     # Sample data
└── README.md
```

---

## Role Permissions Matrix

| Feature            | Super Admin | CEO | HR Admin | BU Head | Manager | Employee |
|--------------------|:-----------:|:---:|:--------:|:-------:|:-------:|:--------:|
| All companies      | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| All business units | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| All users          | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage courses     | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View reports       | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Own data only      | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| AI assistant       | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## ISO Compliance Features

| Requirement              | Implementation                                    |
|--------------------------|---------------------------------------------------|
| Audit logs               | `audit_logs` table — all create/update/delete     |
| Access logs              | `access_logs` table — login and resource access   |
| Document versioning      | `document_versions` table                         |
| No direct overwrite      | Append-only audit trail                           |
| Role-based permissions   | `user_roles` + Supabase RLS                       |
| Multi-tenant isolation   | company_id + business_unit_id on every table      |
| Data separation          | RLS enforced at PostgreSQL level                  |
| Acknowledgements         | `document_acknowledgements` with timestamp + IP   |

---

## AI Assistant Rules

- AI **cannot** modify any official records
- AI interactions are **logged** in `ai_interactions` table
- AI is for content **assistance only** — human review required before use
- Business logic remains **deterministic** — AI is advisory only

---

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Deployment

Deploy to [Vercel](https://vercel.com):

```bash
npx vercel
```

Set the same environment variables in Vercel project settings.
