-- ============================================================
-- HR OS - Platform Tenant Management
-- ============================================================

-- 1. New role values
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_super_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tenant_super_admin';

-- 2. Platform tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  domain     TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Link companies to tenants
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON public.companies(tenant_id);

-- 4. Link profiles to tenants (for tenant_super_admin users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 5. Link user_roles to tenants
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 6. RLS for tenants table (platform_super_admin can read/write; others read-only for their own)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_super_admin can manage tenants"
  ON public.tenants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'platform_super_admin'
        AND is_active = TRUE
    )
  );

CREATE POLICY "tenant_super_admin can view own tenant"
  ON public.tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'tenant_super_admin'
        AND tenant_id = public.tenants.id
        AND is_active = TRUE
    )
  );
