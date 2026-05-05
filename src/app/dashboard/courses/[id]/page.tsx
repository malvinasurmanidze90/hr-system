import { redirect } from 'next/navigation';
export default async function CourseDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/learning/courses/${id}`);
}
