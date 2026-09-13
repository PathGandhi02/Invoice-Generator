import { test, expect, type Page } from '@playwright/test';
const uid='11111111-1111-4111-8111-111111111111', second='22222222-2222-4222-8222-222222222222', bid='c8a94e21-5162-4d77-b436-819362b86ac0';
const customer={id:'f04ed13c-f3ea-4f2a-89d4-70399c165ec7',username:'private_test',full_name:'Private Test Customer',phone:'+919876543210',address:'Private test address',package:'12 Months'};
async function mockCloud(page:Page) {
 let current=uid, profileName='Test Owner';
 const user=()=>({id:current,email:current===uid?'owner@example.test':'second@example.test',email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()});
 const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const drafts=new Map<string,unknown>(); const invoices:unknown[]=[];
 await page.route('**/auth/v1/token?**',route=>{current=route.request().postDataJSON()?.email==='second@example.test'?second:uid;const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:current,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.testsignature`;return route.fulfill({json:{access_token:token,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user:user()}});});
 await page.route('**/auth/v1/user',route=>route.fulfill({json:user()}));
 await page.route('**/auth/v1/logout?**',route=>route.fulfill({status:204}));
 await page.route('**/rest/v1/rpc/ensure_workspace',route=>route.fulfill({json:[{id:current===uid?bid:second,name:current===uid?'Shared Test Workspace':null,protected_key:current===uid?'maruti-giga-fiber':null,created_at:new Date().toISOString()}]}));
 await page.route('**/rest/v1/profiles?**',route=>{if(route.request().method()==='PATCH'){profileName=route.request().postDataJSON().full_name;return route.fulfill({status:204});}return route.fulfill({json:{id:current,full_name:profileName,phone:'',avatar_path:null}});});
 await page.route('**/rest/v1/business_settings?**',route=>route.fulfill({json:[]}));
 await page.route('**/rest/v1/workspace_user_state?**',route=>{if(route.request().method()==='POST'){const body=route.request().postDataJSON();drafts.set(`${current}:${body.key}`,body.value);return route.fulfill({status:201,json:null});}const key=new URL(route.request().url()).searchParams.get('key')?.replace('eq.','');const value=drafts.get(`${current}:${key}`);return route.fulfill({json:value?[{value}]:[]});});
 await page.route('**/rest/v1/customers?**',route=>route.fulfill({json:current===uid?[{id:customer.id}]:[],headers:{'content-range':current===uid?'0-0/1':'*/0'}}));
 await page.route('**/rest/v1/rpc/search_business_customers?**',route=>route.fulfill({json:current===uid?[customer]:[]}));
 await page.route('**/rest/v1/rpc/save_invoice_document',route=>{invoices.push(route.request().postDataJSON());return route.fulfill({json:'a8c5ef9a-4c9d-4635-b9aa-f475dd5c67b6'});});
 await page.route('**/rest/v1/invoices?**',route=>route.fulfill({json:[]}));
 return {invoices,drafts};
}
async function signIn(page:Page,email='owner@example.test') {
 await page.goto('/login');await page.getByRole('textbox',{name:'Email',exact:true}).fill(email);await page.getByRole('textbox',{name:'Password',exact:true}).fill('test-only-password');await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page.getByText(email,{exact:true})).toBeVisible();
}
test('guest welcome makes no protected requests; defaults blank and legacy directory quarantined',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/rest/v1/'))requests.push(r.url());});
 await page.addInitScript(()=>localStorage.setItem('gigainvoice:v1:customers',JSON.stringify([{username:'legacy_private',full_name:'Legacy Protected Name'}])));
 await page.goto('/');await page.getByRole('button',{name:'Continue as Guest',exact:true}).click();await expect(page.getByText('0 customers available',{exact:false})).toBeVisible();
 await page.getByRole('textbox',{name:'Search customers'}).fill('legacy');await expect(page.getByText('No customer found',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Settings',exact:true}).click();await expect(page.getByRole('textbox',{name:'Business name',exact:true})).toHaveValue('');await expect(page.getByRole('textbox',{name:'Default UPI ID',exact:true})).toHaveValue('');expect(requests).toEqual([]);
 await page.reload();await expect(page.getByRole('textbox',{name:'Business name',exact:true})).toHaveValue('');
});
test('cloud search, profile editing, session restore and logout clear protected data across accounts',async({page})=>{
 await mockCloud(page);await signIn(page);await page.getByRole('textbox',{name:'Full name',exact:true}).fill('Updated Profile');await page.getByRole('button',{name:'Save profile',exact:true}).click();await expect(page.getByText('Profile saved.',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('textbox',{name:'Full name',exact:true})).toHaveValue('Updated Profile');await page.getByRole('link',{name:'Invoice',exact:true}).click();
 const request=page.waitForRequest('**/rest/v1/rpc/search_business_customers?**');await page.getByRole('textbox',{name:'Search customers'}).fill('private');expect((await request).postDataJSON()).toEqual({target_business_id:bid,search_text:'private',result_limit:15});
 await page.getByRole('button',{name:'Select Private Test Customer, private_test',exact:true}).click();await expect(page.getByRole('textbox',{name:'Customer name',exact:true})).toHaveValue(customer.full_name);await expect(page.getByText('Draft saved to cloud',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Profile',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('textbox',{name:'Search customers'})).toBeVisible();await expect(page.getByText(customer.full_name,{exact:true})).toHaveCount(0);
 await page.reload();await expect(page.getByText('0 customers available',{exact:false})).toBeVisible();await signIn(page,'second@example.test');await page.getByRole('link',{name:'Invoice',exact:true}).click();await expect(page.getByRole('textbox',{name:'Search customers'})).toBeVisible();await expect(page.getByText(customer.full_name,{exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Settings',exact:true}).click();await expect(page.getByRole('textbox',{name:'Business name',exact:true})).toHaveValue('');
});
test('guest draft requires explicit import and local copy survives',async({page})=>{
 const cloud=await mockCloud(page);await page.goto('/');await page.getByRole('button',{name:'Continue as Guest',exact:true}).click();await page.getByRole('button',{name:'Enter customer manually'}).click();await page.getByRole('textbox',{name:'Customer name',exact:true}).fill('Guest Draft Customer');
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('gigainvoice:v2:guest:draft'))).toContain('Guest Draft Customer');await signIn(page);await expect(page.getByText('Bring your guest work with you?',{exact:true})).toBeVisible();expect(cloud.invoices).toHaveLength(0);expect(cloud.drafts.size).toBe(0);
 await page.getByRole('switch',{name:'Open my local draft in this account',exact:true}).click();await page.getByRole('button',{name:'Import to My Account',exact:true}).click();await expect(page.getByText('Import complete:',{exact:false})).toBeVisible();await page.getByRole('link',{name:'Invoice',exact:true}).click();await expect(page.getByRole('textbox',{name:'Customer name',exact:true})).toHaveValue('Guest Draft Customer');expect(await page.evaluate(()=>localStorage.getItem('gigainvoice:v2:guest:draft'))).toContain('Guest Draft Customer');
});
test('registration validation, verification resend and password reset callback URLs',async({page})=>{
 await page.route('**/auth/v1/signup?**',route=>route.fulfill({json:{user:{id:uid,identities:[]},session:null}}));await page.route('**/auth/v1/recover?**',route=>route.fulfill({json:{}}));await page.route('**/auth/v1/resend?**',route=>route.fulfill({json:{}}));
 await page.goto('/register');await page.getByRole('textbox',{name:'Full name',exact:true}).fill('Test Registration');await page.getByRole('textbox',{name:'Email',exact:true}).fill('register@example.test');await page.getByRole('textbox',{name:'Password',exact:true}).fill('test-pass-123');await page.getByRole('textbox',{name:'Confirm password',exact:true}).fill('mismatch');await page.getByRole('button',{name:'Create Account',exact:true}).click();await expect(page.getByText('Use 8–72 characters',{exact:false})).toBeVisible();
 await page.getByRole('textbox',{name:'Confirm password',exact:true}).fill('test-pass-123');await page.getByRole('button',{name:'Create Account',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await page.getByRole('switch',{name:'I accept the Terms and Privacy notice',exact:true}).click();
 const signup=page.waitForRequest('**/auth/v1/signup?**');await page.getByRole('button',{name:'Create Account',exact:true}).click();expect(new URL((await signup).url()).searchParams.get('redirect_to')).toContain('/auth-callback');await expect(page.getByText('Check your email.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Resend verification email',exact:true}).click();await expect(page.getByText('Try again in',{exact:false})).toBeVisible();
 await page.goto('/forgot-password');await page.getByRole('textbox',{name:'Email',exact:true}).fill('register@example.test');const recovery=page.waitForRequest('**/auth/v1/recover?**');await page.getByRole('button',{name:'Send reset link',exact:true}).click();expect(new URL((await recovery).url()).searchParams.get('redirect_to')).toContain('/reset-password');await expect(page.getByText('If an account uses this email',{exact:false})).toBeVisible();
});
test('cloud restore failure offers retry and logout without exposing old drafts',async({page})=>{
 await mockCloud(page);await signIn(page);await page.route('**/rest/v1/workspace_user_state?**',route=>route.fulfill({status:503,json:{message:'temporarily unavailable'}}));await page.reload();await expect(page.getByText('Your saved workspace could not be restored.',{exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'Search customers'})).toHaveCount(0);await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('link',{name:'Invoice',exact:true}).click();await expect(page.getByRole('textbox',{name:'Search customers'})).toBeVisible();
});

test('PKCE recovery opens the new-password form and strips the one-time code',async({page})=>{
 await mockCloud(page);
 await page.addInitScript(()=>localStorage.setItem('gigainvoice:supabase:auth-code-verifier',JSON.stringify('test-verifier/recovery')));
 await page.goto('/reset-password?code=test-recovery-code');
 await expect(page).toHaveURL(/\/reset-password$/);
 await page.getByRole('textbox',{name:'New password',exact:true}).fill('new-test-password');
 await page.getByRole('textbox',{name:'Confirm password',exact:true}).fill('new-test-password');
 const update=page.waitForRequest(r=>r.url().endsWith('/auth/v1/user')&&r.method()==='PUT');
 await page.getByRole('button',{name:'Update password',exact:true}).click();
 expect((await update).postDataJSON().password).toBe('new-test-password');
 await expect(page.getByText('Password updated.',{exact:false})).toBeVisible();
});
