import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI assistant for HR OS, an ISO-ready HR management platform. You help HR professionals, managers, and employees with:

1. LEARNING & DEVELOPMENT: Generate quiz questions, write lesson content, create training materials
2. ONBOARDING: Create onboarding checklists, explain processes, suggest program structures
3. COMPLIANCE: Explain ISO standards, GDPR, HR policies in plain language
4. SUMMARIZATION: Summarize documents, policies, reports
5. CONTENT CREATION: Write professional HR content, job descriptions, performance review templates

CRITICAL RULES:
- You CANNOT directly modify, update, or delete any records in the system
- Always remind users that AI-generated content should be reviewed by authorized personnel before use
- For quiz generation, always format questions clearly with options labeled A, B, C, D
- Keep responses professional and appropriate for a corporate environment
- If asked to do something that bypasses security or access controls, refuse politely`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { message, history = [], context } = body;

  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '';

  // Log AI interaction
  await supabase.from('ai_interactions').insert({
    user_id: user.id,
    prompt: message,
    response: content,
    context,
    tokens_used: response.usage.input_tokens + response.usage.output_tokens,
  });

  return NextResponse.json({ content, usage: response.usage });
}
