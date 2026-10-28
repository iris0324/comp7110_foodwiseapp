import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
assert.ok(url&&key,'Supabase public configuration required');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const login=await client.auth.signInWithPassword({email:'foodwise-no-such-account@example.invalid',password:'NotARealAccountPassword-123!'});
assert.equal(login.error?.code,'invalid_credentials','Real Auth endpoint must reject invalid credentials');
console.log('PASS: real Supabase Auth rejects invalid credentials');
for(const table of ['food_items','foodwise_state','foodwise_media']){
 const {data,error}=await client.from(table).select('*').limit(1);
 assert.ok(error?.code==='42501'||(!error&&Array.isArray(data)&&data.length===0),`anon must not read ${table}`);
 console.log(`PASS: anonymous access denied or RLS-empty for ${table}`);
}
const {error}=await client.rpc('foodwise_load',{initial_state:{}});
assert.ok(error&&(error.code==='42501'||error.message==='authentication required'),'anonymous RPC must fail authentication');
console.log('PASS: anonymous RPC rejected');
console.log('Verified-user login and two-account E2E tests are not covered by this smoke test.');
