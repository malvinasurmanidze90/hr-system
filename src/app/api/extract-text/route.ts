import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Max 10 MB' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text = '';

    if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      text = buffer.toString('utf-8');

    } else if (ext === 'docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;

    } else if (ext === 'pdf') {
      // require keeps pdf-parse out of the webpack bundle (see serverExternalPackages in next.config.js)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      text = result.text;

    } else {
      return NextResponse.json(
        { error: `".${ext}" ფორმატი არ არის მხარდაჭერილი. გამოიყენეთ: .txt, .md, .docx, .pdf` },
        { status: 400 },
      );
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Text extraction failed' }, { status: 500 });
  }
}
