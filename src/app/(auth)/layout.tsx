import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

async function getTenantForAuth() {
  const h = await headers();
  const slug = h.get('x-tenant-slug');
  if (!slug) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('companies')
    .select('name, logo_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  return data ? { ...data, slug } : { name: slug, logo_url: null, slug };
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantForAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-xl">HR</span>
          </div>
          {tenant ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-gray-500 text-sm mt-1">Powered by HR OS</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">HR OS</h1>
              <p className="text-gray-500 text-sm mt-1">ISO-Ready HR Operating System</p>
            </>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
