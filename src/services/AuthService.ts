import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ProfileRow } from '../models/Database';

function client() { if (!supabase) throw new Error('Cloud accounts are not configured. You can continue as a guest.'); return supabase; }
function authError(code?: string) {
  if (code === 'invalid_credentials') return new Error('Email or password is incorrect.');
  if (code === 'email_not_confirmed') return new Error('Verify your email before signing in.');
  if (code?.includes('rate_limit')) return new Error('Please wait a little before trying again.');
  if (code === 'weak_password') return new Error('Choose a stronger password with at least 8 characters.');
  return new Error('The account request could not be completed. Check your connection and try again.');
}
export function authRedirect(path: 'auth-callback' | 'reset-password') {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/${path}`;
  return Linking.createURL(path, { scheme: 'gigainvoice' });
}
let lastCallback: string | null = null;
export const authService = {
  configured: !!supabase,
  async session() { if (!supabase) return null; const { data,error }=await supabase.auth.getSession(); if(error) throw authError(error.code); return data.session; },
  subscribe(listener:(event:AuthChangeEvent,session:Session|null)=>void) { const subscription=supabase?.auth.onAuthStateChange(listener).data.subscription; return ()=>subscription?.unsubscribe(); },
  async signIn(email:string,password:string) { const {data,error}=await client().auth.signInWithPassword({email:email.trim(),password});if(error)throw authError(error.code);return data; },
  async signUp(fullName:string,email:string,phone:string,password:string) {
    const {data,error}=await client().auth.signUp({email:email.trim(),password,options:{data:{full_name:fullName.trim(),phone:phone.trim()},emailRedirectTo:authRedirect('auth-callback')}});
    if(error)throw authError(error.code);return data;
  },
  async resend(email:string) {const {error}=await client().auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:authRedirect('auth-callback')}});if(error)throw authError(error.code);},
  async resetPassword(email:string) {const {error}=await client().auth.resetPasswordForEmail(email.trim(),{redirectTo:authRedirect('reset-password')});if(error)throw authError(error.code);},
  async updatePassword(password:string) {const {error}=await client().auth.updateUser({password});if(error)throw authError(error.code);},
  async signOut() {if(!supabase)return;const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw authError(error.code);},
  async profile():Promise<ProfileRow> {const api=client();const {data:user,error:userError}=await api.auth.getUser();if(userError||!user.user)throw new Error('Please sign in again.');const {data,error}=await api.from('profiles').select('id,full_name,phone,avatar_path,created_at,updated_at').eq('id',user.user.id).single();if(error)throw new Error('Your profile could not be loaded.');return data;},
  async updateProfile(id:string,fullName:string,phone:string) {const {error}=await client().from('profiles').update({full_name:fullName.trim(),phone:phone.trim()}).eq('id',id);if(error)throw new Error('Your profile could not be saved.');},
  async workspaces() {const {data,error}=await client().rpc('ensure_workspace',{});if(error)throw new Error('Your cloud workspace could not be opened. Check your connection and try again.');return data??[];},
  async callback(url:string) {
    if(lastCallback===url)return;
    const parsed=new URL(url);const params=new URLSearchParams(parsed.search);const hash=new URLSearchParams(parsed.hash.replace(/^#/,''));
    if(params.get('error')||hash.get('error'))throw new Error('This link is expired or invalid. Request a new email link.');
    const code=params.get('code');const access=hash.get('access_token');const refresh=hash.get('refresh_token');
    if(code){const {error}=await client().auth.exchangeCodeForSession(code,params.get('sb_flow_id') ? {flowId:params.get('sb_flow_id')!} : undefined);if(error)throw new Error('This link could not be verified. Open it on the device where you requested it, or request a new link.');}
    else if(access&&refresh){const {error}=await client().auth.setSession({access_token:access,refresh_token:refresh});if(error)throw new Error('This link is expired. Request a new link.');}
    else return;
    lastCallback=url;
    if(Platform.OS==='web'&&typeof window!=='undefined')window.history.replaceState(window.history.state,'',parsed.pathname);
  },
};
