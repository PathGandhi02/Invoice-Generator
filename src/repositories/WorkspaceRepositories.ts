import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database,Json,InvoiceRow } from '../models/Database';
import type { Customer } from '../models/Customer';
import type { Invoice, InvoiceSummary } from '../models/Invoice';
import { defaultSettings,type BusinessSettings } from '../models/BusinessSettings';
import { settingsSchema,invoiceSchema,historyRecordSchema,imageDataSchema } from '../schemas/invoiceSchema';
import { customerSchema,validateCustomers } from '../schemas/customerSchema';
import type { StorageService } from '../services/StorageService';
import type { InvoiceRepository } from './InvoiceRepository';
import { normalizeSearch } from '../utils/search';
import { toHistoryRecord } from '../services/InvoiceService';

export type Persistence=Pick<StorageService,'get'|'set'> & Partial<Pick<StorageService,'flush'>>;
export interface WorkspaceCustomers {count():Promise<number>;search(query:string):Promise<Customer[]>;save(customer:Customer):Promise<void>;getAll():Promise<Customer[]>;}
export class LocalCustomerRepository implements WorkspaceCustomers {
  private pending:Promise<void>=Promise.resolve();
  constructor(private readonly storage:Persistence){}
  async getAll(){const result=validateCustomers(await this.storage.get('customers')??[]);if(result.invalid||result.duplicates)throw new Error('Saved customers could not be read completely. Existing data has been kept; clear guest data in Settings to recover.');return result.customers;}
  async count(){return(await this.getAll()).length;}
  async search(query:string){if(query.trim().length<2)return[];const term=normalizeSearch(query);return(await this.getAll()).filter(c=>normalizeSearch(`${c.username} ${c.full_name}`).includes(term)).slice(0,15);}
  save(customer:Customer){const op=this.pending.catch(()=>{}).then(async()=>{const valid=customerSchema.parse(customer);const rows=await this.getAll();await this.storage.set('customers',[valid,...rows.filter(c=>c.username!==valid.username)]);});this.pending=op;return op;}
}
const columns='id,username,full_name,email,phone,address,package,expiry_date,last_recharge_date' as const;
export class CloudCustomerRepository implements WorkspaceCustomers {
  constructor(private readonly client:SupabaseClient<Database>,readonly businessId:string,readonly userId:string){}
  async count(){const {count,error}=await this.client.from('customers').select('id',{count:'exact'}).eq('business_id',this.businessId).eq('is_active',true).limit(1);if(error)throw new Error('Cloud customers could not be loaded. Check your connection.');return count??0;}
  async search(query:string){const term=query.trim().normalize('NFC');if(term.length<2||term.length>150)return[];const {data,error}=await this.client.rpc('search_business_customers',{target_business_id:this.businessId,search_text:term,result_limit:15}).select(columns);if(error)throw new Error('Cloud search is unavailable. Check your connection or workspace access.');return validateCustomers(data??[]).customers;}
  async getAll(){const all:Customer[]=[];for(let offset=0;;offset+=1000){const {data,error}=await this.client.from('customers').select(columns).eq('business_id',this.businessId).order('username').range(offset,offset+999);if(error)throw new Error('Customers could not be read.');all.push(...validateCustomers(data??[]).customers);if(!data||data.length<1000)return all;}}
  async save(customer:Customer){const {id: _id,...valid}=customerSchema.parse(customer);void _id;const {error}=await this.client.from('customers').upsert({...valid,owner_id:this.userId,business_id:this.businessId,expiry_date:valid.expiry_date||null,last_recharge_date:valid.last_recharge_date||null},{onConflict:'business_id,username'});if(error)throw new Error('Customer could not be saved to this workspace.');}
}
function fromCloudInvoice(row:Pick<InvoiceRow,'id'|'local_id'|'document'|'created_at'|'invoice_number'|'customer_name'|'start_date'|'total_amount'|'is_paid'>):Invoice {
  const valid=invoiceSchema.safeParse(row.document);
  if(!valid.success)throw new Error('An older cloud invoice has no compatible document snapshot. Its original row was preserved.');
  return {...toHistoryRecord(valid.data),savedAt:row.created_at,total:row.total_amount};
}
export class CloudInvoiceRepository implements InvoiceRepository {
  constructor(private readonly client:SupabaseClient<Database>,readonly businessId:string){}
  async summaries(query:string):Promise<InvoiceSummary[]> {
    const all:InvoiceSummary[]=[];
    for(let offset=0;;offset+=500){
      const {data,error}=await this.client.from('invoices').select('id,invoice_number,customer_name,customer_username,start_date,total_amount,is_paid,created_at,currency_symbol').eq('business_id',this.businessId).order('created_at',{ascending:false}).order('id').range(offset,offset+499);
      if(error)throw new Error('Cloud history is unavailable.');
      all.push(...(data??[]).map(row=>({id:row.id,invoiceNumber:row.invoice_number,customerName:row.customer_name,customerUsername:row.customer_username??undefined,date:row.start_date??'',total:row.total_amount,isPaid:row.is_paid,savedAt:row.created_at,currencySymbol:row.currency_symbol})));
      if(!data||data.length<500)break;
    }
    const term=normalizeSearch(query);
    return all.filter(row=>normalizeSearch(`${row.customerName} ${row.customerUsername??''} ${row.invoiceNumber}`).includes(term));
  }
  async get(id:string):Promise<Invoice>{
    const {data,error}=await this.client.from('invoices').select('id,local_id,document,created_at,invoice_number,customer_name,start_date,total_amount,is_paid').eq('business_id',this.businessId).eq('id',id).single();
    if(error||!data)throw new Error('This invoice could not be opened. Reload history and try again.');
    return fromCloudInvoice(data);
  }
  async save(invoice:Invoice){const valid=historyRecordSchema.parse(invoice);const {error}=await this.client.rpc('save_invoice_document',{target_business_id:this.businessId,payload:valid.data as unknown as Json});if(error)throw new Error(error.code==='23505'?'That invoice number already exists in this workspace.':'Invoice could not be saved to the cloud. Check your connection.');}
  async getAll(){const all:Invoice[]=[];for(let offset=0;;offset+=100){const {data,error}=await this.client.from('invoices').select('id,local_id,document,created_at,invoice_number,customer_name,start_date,total_amount,is_paid').eq('business_id',this.businessId).order('created_at',{ascending:false}).range(offset,offset+99);if(error)throw new Error('Cloud history is unavailable.');all.push(...(data??[]).map(fromCloudInvoice));if(!data||data.length<100)return all;}}
  async search(query:string){const term=normalizeSearch(query);return(await this.getAll()).filter(r=>normalizeSearch(`${r.customerName} ${r.customerUsername??''} ${r.invoiceNumber}`).includes(term));}
}
function toDataUrl(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Business image could not be read.'));reader.readAsDataURL(blob);});}
function imageBytes(value:string){const data=imageDataSchema.parse(value)!;const parts=data.split(',');const binary=atob(parts[1]!);return{bytes:Uint8Array.from(binary,c=>c.charCodeAt(0)),mime:parts[0]!.slice(5).split(';')[0]!};}
export class CloudSettingsRepository {
  private logoCache:{data:string;path:string}|null=null;
  constructor(private readonly client:SupabaseClient<Database>,readonly businessId:string,readonly userId:string,private readonly businessName:string|null){}
  async get():Promise<BusinessSettings>{
    const {data,error}=await this.client.from('business_settings').select('company_name,address1,address2,address3,country,phone,email,upi_id,currency_symbol,default_plan_name,default_time_period,default_installation_charge,accent_color,logo_path').eq('business_id',this.businessId).maybeSingle();
    if(error)throw new Error('Cloud business settings could not be loaded.');
    if(!data)return{...defaultSettings,companyName:this.businessName??''};
    let logo:string|null=null;
    if(data.logo_path){const {data:blob,error:assetError}=await this.client.storage.from('business-assets').download(data.logo_path);if(assetError||!blob)throw new Error('Your saved logo could not be loaded. Retry before replacing settings.');logo=imageDataSchema.parse(await toDataUrl(blob));if(logo)this.logoCache={data:logo,path:data.logo_path};}
    return settingsSchema.parse({companyName:data.company_name??'',address1:data.address1??'',address2:data.address2??'',address3:data.address3??'',country:data.country??'IN',phone:data.phone??'',email:data.email??'',upiId:data.upi_id??'',currencySymbol:data.currency_symbol,defaultPlanName:data.default_plan_name??'',defaultTimePeriod:data.default_time_period??'',defaultInstallationCharges:data.default_installation_charge,accentColor:data.accent_color,logo});
  }
  async save(settings:BusinessSettings){
    const valid=settingsSchema.parse(settings);let path:string|null=null;
    if(valid.logo){if(this.logoCache?.data===valid.logo)path=this.logoCache.path;else{const image=imageBytes(valid.logo);path=`${this.businessId}/logo/${Date.now()}-${Math.random().toString(36).slice(2)}.${image.mime.split('/')[1]}`;const {error}=await this.client.storage.from('business-assets').upload(path,image.bytes.buffer,{contentType:image.mime,upsert:false});if(error)throw new Error('Business logo upload failed. Settings were not changed.');this.logoCache={data:valid.logo,path};}}
    const {error}=await this.client.from('business_settings').upsert({owner_id:this.userId,business_id:this.businessId,company_name:valid.companyName||null,address1:valid.address1,address2:valid.address2,address3:valid.address3,country:valid.country,phone:valid.phone,email:valid.email,upi_id:valid.upiId,currency_symbol:valid.currencySymbol,default_plan_name:valid.defaultPlanName,default_time_period:valid.defaultTimePeriod,default_installation_charge:valid.defaultInstallationCharges,accent_color:valid.accentColor,logo_path:path,show_qr:!!valid.upiId},{onConflict:'business_id'});
    if(error)throw new Error('Business settings could not be saved to the cloud.');
  }
}
export class CloudPersistence implements Persistence {
  private pending=new Map<string,Promise<void>>();
  constructor(private readonly client:SupabaseClient<Database>,readonly businessId:string,readonly userId:string,readonly settings:CloudSettingsRepository){}
  async get<T>(key:string):Promise<T|null>{await this.pending.get(key);if(key==='settings')return await this.settings.get() as T;const {data,error}=await this.client.from('workspace_user_state').select('value').eq('business_id',this.businessId).eq('user_id',this.userId).eq('key',key).maybeSingle();if(error)throw new Error('Cloud draft could not be restored.');return(data?.value??null) as T|null;}
  set<T>(key:string,value:T):Promise<void>{const serialized=JSON.parse(JSON.stringify(value)) as Json;const op=(this.pending.get(key)??Promise.resolve()).catch(()=>{}).then(async()=>{if(key==='settings'){await this.settings.save(settingsSchema.parse(serialized));return;}const {error}=await this.client.from('workspace_user_state').upsert({business_id:this.businessId,user_id:this.userId,key,value:serialized},{onConflict:'business_id,user_id,key'});if(error)throw new Error('Cloud draft could not be saved.');});this.pending.set(key,op);void op.finally(()=>{if(this.pending.get(key)===op)this.pending.delete(key);}).catch(()=>{});return op;}
}
