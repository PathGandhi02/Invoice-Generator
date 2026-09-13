import { createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { BusinessRow,ProfileRow } from '../models/Database';
import { authService } from '../services/AuthService';
import { preferencesStorage } from '../services/container';

type AuthValue={session:Session|null;user:Session['user']|null;profile:ProfileRow|null;business:BusinessRow|null;isLoading:boolean;isGuest:boolean;isAuthenticated:boolean;guestChosen:boolean;error:string|null;recovery:boolean;finishRecovery:()=>void;continueAsGuest:()=>Promise<void>;signOut:()=>Promise<void>;refreshProfile:()=>Promise<void>;retry:()=>void;};
const Context=createContext<AuthValue|null>(null);
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider missing');return value;}
export function AuthProvider({children}:{children:ReactNode}){
  const [session,setSession]=useState<Session|null>(null),[profile,setProfile]=useState<ProfileRow|null>(null),[business,setBusiness]=useState<BusinessRow|null>(null);
  const [isLoading,setLoading]=useState(true),[guestChosen,setGuestChosen]=useState(false),[error,setError]=useState<string|null>(null),[recovery,setRecovery]=useState(false),[revision,setRevision]=useState(0);
  const generation=useRef(0);
  const identity=useRef<string|null>(null);
  const identityEmail=useRef<string|undefined>(undefined);
  useEffect(()=>{
    let active=true;
    const restore=async(next:Session|null)=>{
      const version=++generation.current;
      // Clear protected state before doing any asynchronous restoration.
      setSession(next);setProfile(null);setBusiness(null);setError(null);setLoading(true);
      identity.current=next?.user.id??null;
      identityEmail.current=next?.user.email;
      try{
        const choice=await preferencesStorage.get<boolean>('guest-chosen');
        if(!active||version!==generation.current)return;
        setGuestChosen(choice===true);
        if(next){const workspaces=await authService.workspaces();const person=await authService.profile();if(!active||version!==generation.current)return;if(!workspaces[0])throw new Error('No active workspace is available. Contact the workspace administrator.');setProfile(person);setBusiness(workspaces[0]);}
      }catch(e){if(active&&version===generation.current)setError(e instanceof Error?e.message:'Your account could not be restored.');}
      finally{if(active&&version===generation.current)setLoading(false);}
    };
    let eventSeen=false;
    const unsubscribe=authService.subscribe((event,next)=>{
      eventSeen=true;
      if(event==='PASSWORD_RECOVERY')setRecovery(true);
      if(!next)setRecovery(false);
      if((event==='TOKEN_REFRESHED'||event==='USER_UPDATED')&&identity.current===next?.user.id&&identityEmail.current===next?.user.email){setSession(next);return;}
      // Supabase holds its auth lock during callbacks: start API restoration later.
      ++generation.current;setBusiness(null);setProfile(null);setSession(next);setLoading(true);
      setTimeout(()=>{if(active)void restore(next);},0);
    });
    void authService.session().then(next=>{if(active&&!eventSeen)void restore(next);}).catch(()=>{if(active){setLoading(false);setError('Your sign-in could not be restored. Please retry or continue as guest.');}});
    return()=>{active=false;unsubscribe();};
  },[revision]);
  const continueAsGuest=useCallback(async()=>{if(session)await authService.signOut();await preferencesStorage.set('guest-chosen',true);setGuestChosen(true);setError(null);},[session]);
  const signOut=useCallback(async()=>{
    // Hide account screens synchronously, even while logout is reaching Auth.
    ++generation.current;setBusiness(null);setProfile(null);setLoading(true);
    try{await preferencesStorage.set('guest-chosen',true);await authService.signOut();setSession(null);setGuestChosen(true);setRecovery(false);setError(null);}
    catch(e){setError('Sign-out could not be completed. Retry to end this device session.');throw e;}
    finally{setLoading(false);}
  },[]);
  const refreshProfile=useCallback(async()=>{const id=session?.user.id;const person=await authService.profile();if(identity.current===id)setProfile(person);},[session?.user.id]);
  return <Context.Provider value={{session,user:session?.user??null,profile,business,isLoading,isGuest:!session,isAuthenticated:!!session,guestChosen,error,recovery,finishRecovery:()=>setRecovery(false),continueAsGuest,signOut,refreshProfile,retry:()=>setRevision(n=>n+1)}}>{children}</Context.Provider>;
}
