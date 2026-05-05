import { createClient } from '@/lib/supabase/server';

interface AuditEntry {
  action: string;
  resource_type: string;
  resource_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  company_id?: string;
  business_unit_id?: string;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('audit_logs').insert({
      user_id:          user?.id,
      action:           entry.action,
      resource_type:    entry.resource_type,
      resource_id:      entry.resource_id,
      old_data:         entry.old_data,
      new_data:         entry.new_data,
      company_id:       entry.company_id,
      business_unit_id: entry.business_unit_id,
    });
  } catch (err) {
    console.error('[audit] failed to write log:', err);
  }
}

export async function accessLog(entry: {
  action: string;
  resource?: string;
  success?: boolean;
  error_message?: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('access_logs').insert({
      user_id:       user?.id,
      action:        entry.action,
      resource:      entry.resource,
      success:       entry.success ?? true,
      error_message: entry.error_message,
    });
  } catch (err) {
    console.error('[audit] failed to write access log:', err);
  }
}
