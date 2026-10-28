import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {seed} from '../js/data/seed.js';
import {executeCommand} from '../js/domain/commands.js';
import {getStory,getOutcome,contribution,unspent,foodList} from '../js/domain/selectors.js';
import {ghostScreen} from '../js/ui/screens/ghost-v8.js';
import {storyScreen} from '../js/ui/screens/story.js';
import {setLanguage} from '../js/i18n/index.js?v=13.0';
let opn=0;
function op(s,type,payload={}){const result=executeCommand(s,{type,payload,epoch:s.epoch,expectedRevision:s.revision,issuedAt:'2026-10-28T10:00:00.000Z',operationId:'v8qa-'+(++opn)});return result;}
function checkout(rows){let s=seed('en','epoch-'+(++opn));s=op(s,'cart_save',{rows:rows.map((r,i)=>({cartItemId:'c'+i,name:r[0],quantity:r[1],price:r[2],priceMeaning:'unit',note:'',asset:'bag'}))}).state;const result=op(s,'checkout');return {s:result.state,items:result.result.itemIds,purchaseId:result.result.purchaseId};}
function begin(s,itemId,template){return op(s,'story_start',{itemId,source:'preset',template}).state;}
function answer(s,itemId,value){return op(s,'story_answer',{itemId,value}).state;}
function runToRecap(s,itemId,first,rest='unsure',follow='keep_later',reply='sounds_good'){
 let step=getStory(s,itemId).currentStep;
 if(step==='timing_question'){s=answer(s,itemId,'later');step=getStory(s,itemId).currentStep;}
 if(step==='amount_question'||step==='quantity_question'||step==='later_amount')s=answer(s,itemId,first);
 if(getStory(s,itemId).currentStep==='leftover_question')s=answer(s,itemId,rest);
 if(getStory(s,itemId).currentStep==='saved_followup')s=answer(s,itemId,follow);
 if(getStory(s,itemId).currentStep==='ghost_chat')s=answer(s,itemId,reply);
 if(getStory(s,itemId).currentStep==='ghost_reply')s=answer(s,itemId,'continue');
 return s;
}
const sum=r=>['used','shared','saved','discarded','open'].reduce((v,k)=>v+Number(r[k]||0),0);

test('exhaustive preset branch matrix preserves every gram and never pre-credits money',()=>{
 let branches=0;
 for(const template of ['amount','quantity','time'])for(const qty of ['1','2','3.5'])for(const first of ['none','half','all'])for(const rest of ['save','share','finish','discard','unsure'])for(const follow of ['use_later','share_later','keep_later','discard_later']){
  const {s:initial,items:[id]}=checkout([['Chocolate',qty,'2.50']]);let s=begin(initial,id,template);
  s=runToRecap(s,id,first,rest,follow);
  const st=getStory(s,id);
  assert.equal(st.currentStep,'recap',JSON.stringify({template,qty,first,rest,follow}));
  assert.ok(Math.abs(sum(st.recap)-Number(qty))<.0000001,JSON.stringify(st.recap));
  assert.equal(unspent(s),0);
  if(rest==='discard'&&first!=='all')assert.equal(Number(st.recap.remaining),0);
  branches++;
 }
 assert.equal(branches,540);
});

test('purchase quantity, storage, consumption show their own question wording and ghost conversations',()=>{
 const {s:initial,items:[id]}=checkout([['Chocolate',2,'5']]);
 for(const template of ['amount','quantity','time']){
  let s=begin(initial,id,template);let html=storyScreen({s,r:{page:'story',id},e:{fields:{}},phase:'result'});
  const marker={amount:'How much would you have right now?',quantity:'How much of this purchase',time:'When would you use this?'}[template];
  assert.ok(html.includes(marker),template);
  s=runToRecap(s,id,'half','save','keep_later','tell_me_more');
  assert.notEqual(getStory(s,id).ghostMood,null);
  assert.ok(getStory(s,id).answers.length>=4);
 }
});

test('virtual receipt, item choice, History and My Savings are separate surfaces',()=>{
 const {s,items,purchaseId}=checkout([['Yogurt','2','4.50'],['Chocolate','1','3']]);setLanguage('en');
 const receipt=ghostScreen({s,r:{page:'purchase',id:purchaseId}});
 assert.match(receipt,/Your Virtual Receipt/);assert.match(receipt,/Start Story/);assert.doesNotMatch(receipt,/FW000|Saved in this browser|Simulation only/);
 const choose=ghostScreen({s,r:{page:'choose-item',id:purchaseId}});
 assert.match(choose,/Choose an Item/);assert.equal((choose.match(/data-go="story"/g)||[]).length,2);
 const home=ghostScreen({s,r:{page:'ghost-home'}});
 assert.ok(home.indexOf('Start Ghost Buy')<home.indexOf('My Savings'));
 assert.match(home,/data-go="money"/);assert.match(home,/data-go="history"/);
 const history=ghostScreen({s,r:{page:'history'}}),savings=ghostScreen({s,r:{page:'money'}});
 assert.match(history,/Yogurt/);assert.match(history,/Chocolate/);
 assert.match(savings,/AUD \$0\.00/);assert.doesNotMatch(savings,/Chocolate/);
});

test('a saving is counted once and can be withdrawn by changing final decision',()=>{
 const {s:initial,items:[id]}=checkout([['Bread','4','2.50']]);let s=begin(initial,id,'quantity');
 s=runToRecap(s,id,'half','save','keep_later');s=op(s,'story_continue',{itemId:id}).state;
 s=op(s,'outcome_update',{itemId:id,intention:'buy_less',reductionQuantity:'2'}).state;
 assert.equal(unspent(s),0);
 s=op(s,'story_finish',{itemId:id}).state;
 assert.equal(unspent(s),500);
 assert.equal(contribution(getOutcome(s,id),s.purchaseItems[0]),500);
 s=op(s,'outcome_update',{itemId:id,intention:'leave_for_now'}).state;
 assert.equal(unspent(s),1000);
 s=op(s,'outcome_update',{itemId:id,intention:'still_want'}).state;
 assert.equal(unspent(s),0);
});

test('unknown price never creates imaginary savings',()=>{
 const {s:initial,items:[id]}=checkout([['Yogurt','2','']]);let s=begin(initial,id,'amount');
 s=runToRecap(s,id,'none','save','keep_later');s=op(s,'story_continue',{itemId:id}).state;
 s=op(s,'outcome_update',{itemId:id,intention:'leave_for_now'}).state;s=op(s,'story_finish',{itemId:id}).state;
 assert.equal(contribution(getOutcome(s,id),s.purchaseItems[0]),null);assert.equal(unspent(s),0);
 const html=ghostScreen({s,r:{page:'savings-result',id}});assert.match(html,/Not provided/);
});

test('star precedence and tinted categories do not depend on notification choice',()=>{
 let s=seed('en','epoch-food');
 for(const [name,category,date] of [['Apple','produce','2026-10-30'],['Milk','dairy',''],['Eggs','protein','2026-11-02']])s=op(s,'food_add',{fields:{name,category,recordedDate:date,quantity:'1',unit:'pack',location:'',planDate:''}}).state;
 const eggs=s.foodItems.find(x=>x.name==='Eggs');s=op(s,'food_star',{id:eggs.id}).state;
 s=op(s,'settings_update',{values:{phoneNotifications:false,nearDateDays:5}}).state;
 assert.equal(foodList(s)[0].name,'Eggs');
});

test('all independent Ghosty expressions and story card illustrations exist',()=>{
 for(const mood of ['happy','curious','thinking','relieved','worried','excited','sleepy','surprised']){
  assert.ok(existsSync(new URL(`../assets/ghosty/${mood}.png`,import.meta.url)),mood);
 }
 for(const theme of ['amount','quantity','time'])assert.ok(existsSync(new URL(`../assets/story-cards/${theme}.png`,import.meta.url)));
});

test('storage time route branches now / later / unsure without an irrelevant leftover question',()=>{
 const {s:initial,items:[id]}=checkout([['Yogurt','2','4']]);
 for(const [when,expected] of [['now','amount_question'],['later','later_amount'],['unsure','ghost_chat']]){
  let s=begin(initial,id,'time');s=answer(s,id,when);assert.equal(getStory(s,id).currentStep,expected);
  if(when==='unsure'){s=answer(s,id,'sounds_good');s=answer(s,id,'continue');assert.equal(getStory(s,id).recap.open,'2');}
 }
});

test('custom story keeps the original simple template/text choices without fabricating quantities',()=>{
 const {s:initial,items:[id]}=checkout([['Apple','1','2']]);
 let s=op(initial,'story_start',{itemId:id,source:'custom',template:'none',text:'A short personal story'}).state;
 assert.equal(getStory(s,id).currentStep,'text_confirmation');
 assert.equal(getStory(s,id).recap,null);
 s=op(s,'story_continue',{itemId:id}).state;
 assert.equal(getStory(s,id).currentStep,'intention');
 s=op(s,'outcome_update',{itemId:id,intention:'still_want'}).state;
 s=op(s,'story_finish',{itemId:id}).state;
 assert.equal(getStory(s,id).status,'completed');
 assert.equal(unspent(s),0);
});
