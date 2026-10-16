import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getFormattedUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'your-project-url.supabase.co') return null;
  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;
  try {
    new URL(withProtocol);
    return withProtocol;
  } catch {
    return null;
  }
}

export function getSupabase(): SupabaseClient | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const formattedUrl = getFormattedUrl(rawUrl);
  if (!formattedUrl || !anonKey || anonKey === 'your-anon-key-here') {
    return null;
  }

  try {
    return createClient(formattedUrl, anonKey);
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

export const isSupabaseConfigured = Boolean(
  getFormattedUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
);
