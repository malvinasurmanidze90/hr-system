'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { ArrowLeft, Save, Upload, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function NewLessonPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', content: '', lesson_type: 'text', duration_minutes: 15,
    sort_order: 0, is_required: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from('lessons').insert({ ...form, course_id: courseId });
    setLoading(false);
    router.push(`/dashboard/lms/courses/${courseId}`);
  };

  const generateWithAI = async () => {
    if (!form.title) { alert('Enter a lesson title first'); return; }
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Write detailed lesson content for a corporate training lesson titled: "${form.title}". Include key concepts, explanations, and practical examples. Format in clear paragraphs.`,
          context: 'lesson_generation',
        }),
      });
      const data = await res.json();
      if (data.content) setForm(p => ({ ...p, content: data.content }));
    } finally {
      setAiLoading(false);
    }
  };

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href={`/dashboard/lms/courses/${courseId}`}>
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /> Back to Course</Button>
        </Link>
      </div>
      <PageHeader title="Add Lesson" subtitle="Create a new lesson for this course" />

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Lesson Details</h3>
              <Input label="Lesson Title" required value={form.title} onChange={f('title')} placeholder="e.g. Introduction to Data Protection" />
              <div className="grid grid-cols-3 gap-4">
                <Select label="Type" value={form.lesson_type} onChange={f('lesson_type')}>
                  <option value="text">Text / Article</option>
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="document">Document</option>
                </Select>
                <Input label="Duration (min)" type="number" min={1} value={form.duration_minutes} onChange={f('duration_minutes')} />
                <Input label="Order" type="number" min={0} value={form.sort_order} onChange={f('sort_order')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Lesson Content</h3>
                <Button type="button" variant="secondary" size="sm" onClick={generateWithAI} loading={aiLoading}>
                  <Sparkles size={14} /> Generate with AI
                </Button>
              </div>
              {form.lesson_type === 'text' ? (
                <Textarea
                  label="Content"
                  rows={16}
                  value={form.content}
                  onChange={f('content')}
                  placeholder="Write your lesson content here, or use AI to generate it..."
                  className="font-mono text-sm"
                />
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                  <Upload size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">File upload via Supabase Storage</p>
                  <p className="text-xs text-gray-400 mt-1">Configure Supabase Storage bucket then upload here</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/lms/courses/${courseId}`}>
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" loading={loading}>
              <Save size={16} /> Save Lesson
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
