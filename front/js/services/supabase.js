import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY} from '../supabase-config.js';
export const supabase = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
 ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}) : null;
export const redirectURL = () => new URL('./', document.baseURI).href;
