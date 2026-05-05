import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const bucket = formData.get('bucket') as string ?? 'documents';
  const path = formData.get('path') as string;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });

  const ALLOWED_TYPES = ['application/pdf', 'video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/gif',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });

  const ext = file.name.split('.').pop();
  const filePath = path ?? `${user.id}/${Date.now()}.${ext}`;

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient.storage
    .from(bucket)
    .upload(filePath, file, { upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = serviceClient.storage.from(bucket).getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrl, path: filePath });
}
