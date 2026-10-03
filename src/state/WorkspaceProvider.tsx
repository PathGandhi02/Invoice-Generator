import {createContext,useContext,useMemo,type ReactNode} from 'react';
import {supabase} from '../lib/supabase';
import {useGuestData} from './GuestDataProvider';
import {LocalInvoiceRepository} from '../repositories/LocalInvoiceRepository';
import {CloudCustomerRepository,CloudInvoiceRepository,CloudPersistence,CloudSettingsRepository,LocalCustomerRepository,type Persistence,type WorkspaceCustomers} from '../repositories/WorkspaceRepositories';
import type {InvoiceRepository} from '../repositories/InvoiceRepository';
import {useAuth} from './AuthProvider';
type Services={storage:Persistence;customers:WorkspaceCustomers;invoices:InvoiceRepository;cloud:boolean;scope:string;};
const Context=createContext<Services|null>(null);
export function useWorkspace(){const value=useContext(Context);if(!value)throw new Error('WorkspaceProvider missing');return value;}
export function WorkspaceProvider({children}:{children:ReactNode}){
 const {user,business}=useAuth();
 const {storage:guestStorage,state:guestState}=useGuestData();
 const userId=user?.id, businessId=business?.id, businessName=business?.name;
 const value=useMemo<Services>(()=>{
  if(userId&&businessId&&supabase){const settings=new CloudSettingsRepository(supabase,businessId,userId,businessName??null);return{storage:new CloudPersistence(supabase,businessId,userId,settings),customers:new CloudCustomerRepository(supabase,businessId,userId),invoices:new CloudInvoiceRepository(supabase,businessId),cloud:true,scope:`${userId}:${businessId}`};}
  if(!guestStorage)throw new Error('Guest storage is not ready.');
  return{storage:guestStorage,customers:new LocalCustomerRepository(guestStorage),invoices:new LocalInvoiceRepository(guestStorage),cloud:false,scope:`guest:${guestState?.generation}`};
 },[userId,businessId,businessName,guestStorage,guestState?.generation]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
