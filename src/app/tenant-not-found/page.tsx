import { Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';

export const metadata = { title: 'Company Not Found' };

export default async function TenantNotFoundPage() {
  const h = await headers();
  const slug = h.get('x-tenant-slug') ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Building2 size={28} className="text-indigo-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Company Not Found</h1>

        {slug && (
          <p className="text-sm font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg inline-block mb-3">
            {slug}.hrapp.org
          </p>
        )}

        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          The organization you&apos;re looking for doesn&apos;t exist or is not active on
          this platform. Please check the URL or contact your administrator.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="https://hrapp.org/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:opacity-90 transition-opacity"
          >
            Go to hrapp.org
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
