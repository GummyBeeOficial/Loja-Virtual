import { createClient } from './supabase/client';

// This file is now a legacy wrapper to maintain compatibility
// with existing imports while ensuring a single instance.
export const supabase = createClient();
