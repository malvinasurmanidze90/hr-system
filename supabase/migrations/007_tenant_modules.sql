-- tenant_modules: per-tenant feature flags managed by platform_super_admin

CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_key text        NOT NULL,
  is_enabled boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, module_key)
);

ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- platform_super_admin can manage all tenant module flags
CREATE POLICY "platform_admin_manage_tenant_modules"
  ON public.tenant_modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'platform_super_admin'
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'platform_super_admin'
        AND is_active = true
    )
  );

-- tenant_super_admin can read their own tenant's modules
CREATE POLICY "tenant_admin_read_own_modules"
  ON public.tenant_modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'tenant_super_admin'
        AND tenant_id = tenant_modules.tenant_id
        AND is_active = true
    )
  );

-- Any authenticated user can read modules for their own tenant
-- (needed for sidebar module gating in the dashboard layout)
CREATE POLICY "users_read_own_tenant_modules"
  ON public.tenant_modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.companies c ON c.tenant_id = tenant_modules.tenant_id
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = c.id
        AND ur.is_active = true
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER tenant_modules_updated_at
  BEFORE UPDATE ON public.tenant_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
