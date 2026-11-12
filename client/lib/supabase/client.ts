import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseConfigError = (() => {
  if (!supabaseUrl || !supabasePublishableKey) {
    return 'Supabase authentication is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to client/.env.local.';
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.supabase.co')) {
      return 'NEXT_PUBLIC_SUPABASE_URL must be an HTTPS Supabase project URL.';
    }
  } catch {
    return 'NEXT_PUBLIC_SUPABASE_URL is not a valid URL.';
  }

  if (supabasePublishableKey.length < 20 || supabasePublishableKey.includes('your-')) {
    return 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing or still contains a placeholder value.';
  }

  return null;
})();

export const supabase = (() => {
  if (supabaseConfigError || !supabaseUrl || !supabasePublishableKey) {
    return null;
  }
  return createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
})();

export const supabaseConfigured = Boolean(supabase);
