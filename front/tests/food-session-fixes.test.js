import test from 'node:test';
import assert from 'node:assert/strict';
import {signOutAndClear,foodSavePage} from '../js/services/food-session-flow.js';
import {Store} from '../js/app/store.js';
import {seed} from '../js/data/seed.js';
import {executeCommand} from '../js/domain/commands.js';
import {readFileSync} from 'node:fs';

test('new food saves before navigating to list; failed save keeps editor and retry; select existing food still routes to detail',async()=>{
 let state=seed('en','test');let failed=true;let page='food-new';
 const repository={name:'fix-test',commitCommand:async c=>{if(failed)throw Error('offline');const out=executeCommand(state,c);state=out.state;return out;}};
 const store=new Store(repository);store.state=state;
 try{
  assert.equal(await store.commit('food_add',{fields:{name:'Milk',quantity:'1',unit:'L',category:'dairy',recordedDate:'2026-11-01'}},[],()=>{page=foodSavePage(true);}),false);
  assert.equal(page,'food-new');assert.ok(store.pending);assert.equal(store.state.foodItems.length,0);
  failed=false;assert.equal(await store.retry(),true);assert.equal(page,'food');assert.equal(store.state.foodItems.length,1);
  assert.equal(foodSavePage(false),'food-detail');
  const screen=readFileSync(new URL('../js/ui/screens/food.js',import.meta.url),'utf8');assert.match(screen,/food-detail/);
 }finally{store.channel?.close();}
});

test('signout clears only after SDK success; failure preserves account; guest does not sign out an account',async()=>{
 let cleared=0,calls=0;
 const error=Error('network');
 await assert.rejects(signOutAndClear({auth:{signOut:async()=>({error})}},()=>cleared++),/network/);assert.equal(cleared,0);
 await signOutAndClear({auth:{signOut:async()=>{calls++;return {error:null};}}},async()=>{cleared++;});
 assert.equal(calls,1);assert.equal(cleared,1);
 await signOutAndClear(null,()=>cleared++);assert.equal(calls,1);assert.equal(cleared,2);
 const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 assert.match(main,/signOutAndClear/);assert.match(main,/store.pending=null;store.error=null;store.status='idle'/);
 assert.match(main,/guestEnteredThisLaunch=false/);assert.match(main,/navigateNow\('login','',true\)/);
 assert.doesNotMatch(main,/localStorage\.clear\(|deleteDatabase/);
});
