import test from 'node:test';import assert from 'node:assert/strict';
import {seed} from '../js/data/seed.js';import {reduceCommand} from '../js/domain/commands.js';import {getStory} from '../js/domain/selectors.js';
let n=0,validated=0;
function run(s,type,payload={}){return reduceCommand(s,{type,payload,operationId:'matrix_'+(++n),issuedAt:'2026-10-28T10:00:00Z'});}
function setup(quantity='2'){let s=seed('en','m');s=run(s,'cart_save',{rows:[{cartItemId:'c',name:'Yogurt',quantity,price:'4.00',priceMeaning:'unit',note:''}]}).state;const p=run(s,'checkout');return {s:p.state,id:p.result.itemIds[0]};}
function result(route,quantity,values){let {s,id}=setup(quantity);s=run(s,'story_start',{itemId:id,template:route,source:'preset'}).state;for(const v of values)s=run(s,'story_answer',{itemId:id,value:v}).state;const st=getStory(s,id);assert.equal(st.currentStep,'recap');const r=st.recap;const total=['used','shared','saved','discarded','open'].reduce((a,k)=>a+Number(r[k]),0);assert.equal(total,Number(quantity),JSON.stringify({route,quantity,values,r}));validated++;}
test('full story outcome matrix across unique routes',()=>{
 for(const qty of ['1','2','4'])for(const amt of ['none','half','all']){
  if(amt==='all'){result('amount',qty,[amt,'activity_done']);continue;}
  for(const dispo of ['save','share','discard','unsure']){
   if(dispo==='save')for(const fate of ['use_later','share_later','keep_later','discard_later'])result('amount',qty,[amt,dispo,fate,'activity_done']);
   else result('amount',qty,[amt,dispo,'activity_done']);
  }
 }
 for(const quantity of ['1','2','3','4'])for(let used=0;used<=Number(quantity);used++){
  if(used===Number(quantity)){result('quantity',quantity,['qty:'+used,'activity_done']);continue;}
  for(const fate of ['save','share','discard','unsure'])result('quantity',quantity,['qty:'+used,fate,'activity_done']);
 }
 for(const quantity of ['1','2','3'])for(const storage of ['fridge','freezer','pantry','unsure'])for(const when of ['soon','days','later','unsure'])for(const fate of ['use','share','save','discard','unsure'])result('time',quantity,[storage,when,fate,'activity_done']);
 assert.ok(validated>=280);console.log('Validated simulated food outcomes:',validated);
});
