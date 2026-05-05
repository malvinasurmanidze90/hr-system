'use client';
import { createContext, useContext } from 'react';

export interface TenantData {
  tenantSlug: string | null;
  companyId: string | null;
  companyName: string | null;
  logoUrl: string | null;
}

const TenantCtx = createContext<TenantData>({
  tenantSlug: null,
  companyId: null,
  companyName: null,
  logoUrl: null,
});

export function TenantProvider({
  value,
  children,
}: {
  value: TenantData;
  children: React.ReactNode;
}) {
  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant(): TenantData {
  return useContext(TenantCtx);
}
