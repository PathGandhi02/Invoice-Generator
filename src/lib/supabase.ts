import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import type { Database } from '../models/Database';
import { validateSupabaseConfig } from './supabaseConfig';

const config = validateSupabaseConfig(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const supabaseConfigured = !!config;
const browserOrNative = Platform.OS !== 'web' || typeof window !== 'undefined';
export const supabase = config ? createClient<Database>(config.url, config.key, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage, lock: processLock } : {}),
    persistSession: browserOrNative,
    autoRefreshToken: browserOrNative,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storageKey: 'gigainvoice:supabase:auth',
  },
}) : null;

if (supabase && Platform.OS !== 'web') {
  const client = supabase;
  if (AppState.currentState !== 'active') client.auth.stopAutoRefresh();
  AppState.addEventListener('change', state => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
}
