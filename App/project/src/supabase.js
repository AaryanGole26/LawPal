import { createClient } from '@supabase/supabase-js';

const normalizeSupabaseUrl = (value) => {
	const trimmed = (value || '').trim();
	return trimmed.replace(/\/+$/, '');
};

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);