'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: '',
    difficulty: 'beginner', estimated_duration_minutes: 30,
    passing_score: 70, status: 'draft',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

    const { data, error } = await supabase.from('courses').insert({
      ...form,
      company_id: profile?.company_id,
      created_by: user.id,
    }).select().single();

    setLoading(false);
    if (!error && data) {
      router.push(`/dashboard/lms/courses/${data.id}`);
    }
  };

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="p-6">
      <PageHeader
        title="Create Course"
        subtitle="Build a new learning course"
        actions={
          <Link href="/dashboard/lms/courses">
            <Button variant="secondary"><ArrowLeft size={16} /> Back</Button>
          </Link>
        }
      />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card className="mb-4">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 mb-1">Course Information</h3>
              <Input label="Course Title" required value={form.title} onChange={f('title')} placeholder="e.g. Security & Compliance Fundamentals" />
              <Textarea label="Description" rows={4} value={form.description} onChange={f('description')} placeholder="What will learners gain from this course?" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Category" value={form.category} onChange={f('category')} placeholder="e.g. Compliance" />
                <Select label="Difficulty" value={form.difficulty} onChange={f('difficulty')}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Duration (minutes)" type="number" min={1} value={form.estimated_duration_minutes} onChange={f('estimated_duration_minutes')} />
                <Input label="Passing Score (%)" type="number" min={0} max={100} value={form.passing_score} onChange={f('passing_score')} />
              </div>
              <Select label="Status" value={form.status} onChange={f('status')}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Link href="/dashboard/lms/courses">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" loading={loading}>
              <Save size={16} /> Create Course
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
