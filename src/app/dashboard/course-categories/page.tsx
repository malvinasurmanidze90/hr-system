import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/badge';
import { CategoryActions, EditCategoryButton, DeleteCategoryButton } from './category-actions';
import { CategoryFilters } from './category-filters';
import { Tag } from 'lucide-react';

export const metadata = { title: 'კურსების კატეგორიები' };

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function CourseCategoriesPage({ searchParams }: Props) {
  const { status, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('course_categories')
    .select('id, name, description, status')
    .order('name', { ascending: true });

  if (status === 'active' || status === 'inactive') query = query.eq('status', status);
  if (q?.trim()) query = query.ilike('name', `%${q.trim()}%`);

  const { data: categories, error } = await query;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">კურსების კატეგორიები</h1>
              <p className="text-indigo-200 text-sm">სასწავლო კურსების კატეგორიების სია</p>
            </div>
            <CategoryActions />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{categories?.length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">სულ კატეგორია</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{categories?.filter((c: any) => c.status === 'active').length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">აქტიური</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <CategoryFilters />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {error ? (
            <div className="px-6 py-12 text-center text-sm text-red-500">
              მონაცემების ჩატვირთვა ვერ მოხერხდა: {error.message}
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                <Tag size={24} className="text-indigo-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">კატეგორიები არ მოიძებნა.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    {['სახელი', 'აღწერა', 'სტატუსი', ''].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((cat: any) => (
                    <tr key={cat.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Tag size={13} className="text-indigo-600" />
                          </div>
                          <span className="font-semibold text-gray-900">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 max-w-md truncate">
                        {cat.description ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={cat.status ?? 'active'} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <EditCategoryButton category={cat} />
                          <DeleteCategoryButton id={cat.id} name={cat.name} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
