import {clone,qty,cmp,date,required,fail,sub,cents,usageQty,add,reductionQty} from '../core/values.js?v=13.0';
import {seed} from '../data/seed.js?v=13.0';
import {createStory,templates,firstStep,prepareAnswer,applyAction,deriveRecap} from './story-machine.js?v=13.0';
import {beginStory,advanceStory,advanceLaterAmount,finalizeRecap} from './story-v2.js';
export const CATEGORIES=['produce','dairy','protein','staples','snacks','other'];
export const LOCATIONS=['','fridge','freezer','pantry'];
export function foodFields(raw){return {name:required(raw.name),quantity:qty(raw.quantity,true),unit:String(raw.unit??'').trim(),category:CATEGORIES.includes(raw.category)?raw.category:'other',recordedDate:date(raw.recordedDate),location:LOCATIONS.includes(raw.location)?raw.location:'',planDate:date(raw.planDate)};}
export function cartFields(raw){const quantity=qty(raw.quantity,true),unitCents=cents(raw.price);if(unitCents===null)fail('moneyError');const total=raw.priceMeaning==='total'?unitCents:Math.round(unitCents*Number(quantity));if(total!==null&&(!Number.isSafeInteger(total)||total>999999999))fail('moneyError');return {cartItemId:raw.cartItemId,name:required(raw.name),quantity,unit:String(raw.unit||'').trim(),unitCents,estimateCents:total,priceMeaning:raw.priceMeaning==='unit'?'unit':'total',note:String(raw.note||''),asset:['bag','chocolate','milk','banana','tomato'].includes(raw.asset)?raw.asset:'bag',productId:/^GB-P0[1-8]$/.test(raw.productId||'')?raw.productId:null};}
export function reduceCommand(current,command){
 let s=normalizeState(clone(current));const {type,payload:p={}}=command;const now=command.issuedAt;const make=(prefix,n='')=>prefix+'_'+command.operationId+n;let result={};
 const item=()=>s.purchaseItems.find(x=>x.id===p.itemId)||fail('missing');
 const story=()=>s.stories.find(x=>x.purchaseItemId===p.itemId)||fail('missing');
 const food=()=>s.foodItems.find(x=>x.id===p.id)||fail('missing');
 const event=(f,kind,before)=>s.foodEvents.push({id:make('event'),foodId:f.id,kind,before,after:f.remainingQuantity,createdAt:now});
 switch(type){
 case 'language':if(!['en','zh'].includes(p.language))fail('stateError');s.settings.language=p.language;break;
 case 'reset':s=seed(s.settings.language,make('epoch'),now);break;
 case 'food_add':{const f=foodFields(p.fields);const id=make('food');s.foodItems.push({...f,id,batchId:make('batch'),initialQuantity:f.quantity,remainingQuantity:f.quantity,status:'available',source:'manual',createdAt:now,updatedAt:now,isStarred:false});result={id};break;}
 case 'food_edit':{const f=food();if(f.status!=='available')fail('stateError');const fields=foodFields(p.fields),before=f.remainingQuantity;const remaining=fields.quantity!==f.initialQuantity?fields.quantity:qty(p.fields.remaining??f.remainingQuantity);if(cmp(remaining,fields.quantity)>0)fail('inventoryAmountError');if(remaining==='0'&&!p.confirmUsed)fail('confirmZero');Object.assign(f,fields,{initialQuantity:fields.quantity,remainingQuantity:remaining,updatedAt:now});if(remaining==='0')f.status='used_up';event(f,remaining==='0'?'used_up':cmp(remaining,before)<0?'remaining':'correction',before);break;}
 case 'food_remaining':{const f=food(),remaining=qty(p.remaining);if(f.status!=='available'||cmp(remaining,f.remainingQuantity)>0)fail('remainingError');if(remaining==='0'&&!p.confirmUsed)fail('confirmZero');const before=f.remainingQuantity;f.remainingQuantity=remaining;if(remaining==='0')f.status='used_up';f.updatedAt=now;event(f,remaining==='0'?'used_up':'remaining',before);break;}
 case 'food_end':{const f=food();if(f.status!=='available'||!['used_up','discarded','removed'].includes(p.status))fail('stateError');const before=f.remainingQuantity;f.status=p.status;if(p.status!=='removed')f.remainingQuantity='0';f.updatedAt=now;event(f,p.status,before);break;}
 case 'food_plan':{const f=food();if(f.status!=='available')fail('stateError');f.planDate=date(p.planDate);f.updatedAt=now;event(f,'plan',f.remainingQuantity);break;}
 case 'receipt_save':{let r=s.receiptImports.find(x=>x.id===p.id);if(r?.status==='confirmed')fail('stateError');const values={id:p.id,imageId:p.imageId||null,sample:!!p.sample,simulated:!p.qrPayload,qrPayload:p.qrPayload||null,receiptId:p.receiptId||null,storeName:p.storeName||null,receiptTotal:p.receiptTotal||null,rawRows:clone(p.rows),status:'draft',savedAt:now};if(r)Object.assign(r,values);else s.receiptImports.push(values);result={id:p.id};break;}
 case 'receipt_confirm':{if(p.qrPayload&&s.receiptImports.some(x=>x.status==='confirmed'&&x.qrPayload===p.qrPayload&&x.id!==p.id))fail('alreadyImported');let r=s.receiptImports.find(x=>x.id===p.id);if(r?.status==='confirmed'){result={foodIds:r.foodIds};break;}if(!p.rows?.length)fail('emptyReceipt');const rows=p.rows.map(foodFields);const batchId=make('batch');const ids=rows.map((f,i)=>{const id=make('food',i);s.foodItems.push({...f,id,batchId,initialQuantity:f.quantity,remainingQuantity:f.quantity,status:'available',source:'receipt',createdAt:now,updatedAt:now,isStarred:false});return id;});const record={id:p.id,imageId:p.imageId||null,sample:!!p.sample,simulated:!p.qrPayload,qrPayload:p.qrPayload||null,receiptId:p.receiptId||null,storeName:p.storeName||null,receiptTotal:p.receiptTotal||null,rawRows:clone(p.rows),status:'confirmed',confirmationOperationId:command.operationId,foodIds:ids,confirmedAt:now};if(r)Object.assign(r,record);else s.receiptImports.push(record);result={foodIds:ids};break;}
 case 'cart_save':s.cart=clone(p.rows);s.drafts=s.drafts.filter(x=>x.type!=='cart');s.drafts.push({id:'cart',type:'cart',fields:clone(p.rows),savedAt:now,baseRevision:s.revision});break;
 case 'checkout':{if(!s.cart.length)fail('emptyCart');const rows=s.cart.map(cartFields);const purchaseId=make('purchase'),itemIds=[];rows.forEach((r,i)=>{const id=make('item',i);itemIds.push(id);s.purchaseItems.push({...r,id,purchaseId,createdAt:now});s.stories.push(createStory(make('story',i),id,r.quantity));s.outcomes.push({purchaseItemId:id,intention:null,actualResult:'unconfirmed',estimateCents:r.estimateCents,updatedAt:now});});s.purchases.push({id:purchaseId,receiptNumber:'FW'+String(s.purchases.length+1).padStart(4,'0'),createdAt:now,itemIds,checkoutSnapshot:clone(rows)});s.cart=[];s.drafts=s.drafts.filter(x=>x.type!=='cart');result={purchaseId,itemIds};break;}
 case 'custom_save':{const st=story();if(st.status==='completed')fail('completedLocked');if(!['source','custom_edit'].includes(st.currentStep))fail('stateError');st.status='in_progress';st.currentStep='custom_edit';s.drafts=s.drafts.filter(x=>x.id!==p.draftId);s.drafts.push({id:p.draftId,type:'custom',targetId:p.itemId,storyRevision:st.storyRevision,fields:clone(p.fields),savedAt:now,baseRevision:s.revision});break;}
 case 'story_start':{const st=story(),it=item();if(st.status==='completed')fail('completedLocked');if(!['source','custom_edit'].includes(st.currentStep))fail('stateError');if(!templates.includes(p.template)&&p.template!=='none')fail('templateError');if(p.source==='custom')required(p.text,'textError');else if(p.source!=='preset'||p.template==='none')fail('stateError');beginStory(st,it,p.template==='none'?'amount':p.template,p.source,p.source==='custom'?p.text:'');if(p.template==='none')Object.assign(st,{template:'none',simulationStatus:'not_simulated',currentStep:'text_confirmation',usedQuantity:null,sharedQuantity:null,remainingQuantity:null,recap:null});s.drafts=s.drafts.filter(x=>x.targetId!==p.itemId);break;}
 case 'story_answer':{const st=story();if(st.currentStep==='later_amount')advanceLaterAmount(st,item(),p.value,now);else advanceStory(st,item(),p.value,now);break;}
 case 'story_back':{
  const st=story(),it=item(),o=s.outcomes.find(x=>x.purchaseItemId===p.itemId);
  if(st.status==='completed')fail('completedLocked');
  if(st.currentStep==='source'||st.currentStep==='custom_edit')break;
  if(st.currentStep==='intention'){st.currentStep='recap';o.intention=null;o.reductionQuantity=null;break;}
  const previous=clone(st.answers||[]);
  if(st.currentStep==='recap'&&previous.at(-1)?.questionKey==='ghost_activity')previous.pop();
  else if(previous.length)previous.pop();
  else {st.currentStep='source';st.status='not_started';break;}
  const originalRevision=st.storyRevision||0;const originalSource=st.source,originalText=st.customText,originalTemplate=st.template;
  beginStory(st,it,originalTemplate,originalSource,originalText);st.storyRevision=originalRevision+1;
  for(const a of previous){if(st.currentStep==='later_amount')advanceLaterAmount(st,it,a.value,a.confirmedAt);else advanceStory(st,it,a.value,a.confirmedAt);}
  o.intention=null;o.reductionQuantity=null;st.recap=null;st.activityDone=false;
  break;
 }
 case 'story_continue':{const st=story();if(st.status==='completed')fail('completedLocked');if(['recap','text_confirmation'].includes(st.currentStep))st.currentStep='intention';else if(st.currentStep==='intention'&&p.back)st.currentStep='recap';else fail('stateError');break;}
 case 'story_revise':{const st=story();if(st.status==='completed')fail('completedLocked');st.storyRevision++;s.storyActions=s.storyActions.filter(x=>x.storyId!==st.id);s.drafts=s.drafts.filter(x=>x.targetId!==p.itemId);const template=st.template||'amount';beginStory(st,item(),template,st.source,st.customText||'');if(p.source){st.currentStep='source';st.status='not_started';}break;}
 case 'story_finish':{const st=story();if(st.currentStep!=='intention')fail('stateError');const o=s.outcomes.find(x=>x.purchaseItemId===p.itemId);if(!['leave_for_now','buy_less','still_want'].includes(o.intention))fail('stateError');if(o.intention==='buy_less')reductionQty(o.reductionQuantity,item().quantity);st.status='completed';st.currentStep='completed';st.completedAt=now;break;}
 case 'food_delete':{
  // Permanent per-item deletion: not a past event and not a bulk data reset.
  const f=food();s.foodItems=s.foodItems.filter(row=>row.id!==f.id);
  s.foodEvents=s.foodEvents.filter(row=>row.foodId!==f.id);
  for(const receipt of s.receiptImports){if(Array.isArray(receipt.foodIds))receipt.foodIds=receipt.foodIds.filter(id=>id!==f.id);}
  break;
 }
 case 'food_star':{const f=food();f.isStarred=!f.isStarred;f.updatedAt=now;break;}
 case 'settings_update':{const opts=p.values||{};const permitted=['nearDateDays','phoneNotifications','storyAnimations','reduceMotion','storyGuidance'];for(const [k,v] of Object.entries(opts)){if(!permitted.includes(k))fail('stateError');if(k==='nearDateDays'){if(![1,3,5,7].includes(Number(v)))fail('stateError');s.settings[k]=Number(v);}else {if(typeof v!=='boolean')fail('stateError');s.settings[k]=v;}}break;}
 case 'outcome_update':{const it=item(),o=s.outcomes.find(x=>x.purchaseItemId===p.itemId);
  if('intention'in p){if(![null,'leave_for_now','still_want','buy_less','undecided'].includes(p.intention))fail('stateError');o.intention=p.intention;if(p.intention!=='buy_less')o.reductionQuantity=null;}
  if('reductionQuantity'in p&&o.intention==='buy_less')o.reductionQuantity=reductionQty(p.reductionQuantity,it.quantity);
  if('actualResult'in p){if(!['unconfirmed','not_bought','bought','bought_less'].includes(p.actualResult))fail('stateError');o.actualResult=p.actualResult;if(p.actualResult!=='bought_less')o.actualReductionQuantity=null;}
  if(o.actualResult==='bought_less')o.actualReductionQuantity=reductionQty(p.actualReductionQuantity??o.actualReductionQuantity,it.quantity);
  if('price'in p)o.estimateCents=cents(p.price);o.updatedAt=now;break;}

 default:fail('stateError');
 }
 validateState(s);return {state:s,result};
}
// Extend v1 snapshots without clearing the existing browser database.
export function normalizeState(s){
 s.settings={nearDateDays:5,phoneNotifications:false,storyAnimations:true,reduceMotion:false,storyGuidance:true,...(s.settings||{})};
 // Legacy samples are explicitly tagged. Never remove user-entered food (even if its name matches a fixture).
 s.foodItems=s.foodItems.filter(f=>f.source!=='sample');
 s.foodEvents=s.foodEvents.filter(ev=>s.foodItems.some(f=>f.id===ev.foodId));
 for(const f of s.foodItems){if(!('isStarred' in f))f.isStarred=false;}
 for(const row of s.cart){if(!row.priceMeaning)row.priceMeaning='total';}
 for(const st of s.stories){
  // V8 story steps cannot be resumed in the new branching engine. Keep the
  // historical purchase and every completed session; offer to start only
  // unfinished old sessions again without touching user food/cart/history.
  if(st.status==='in_progress'&&st.engineVersion!==9){
   const item=s.purchaseItems.find(x=>x.id===st.purchaseItemId);
   st.status='not_started';st.currentStep='source';st.simulationStatus='pending';
   st.usedQuantity='0';st.sharedQuantity='0';st.remainingQuantity=item?.quantity||'0';
   st.recap=null;st.disposition=null;st.answers=[];st.activeActionId=null;
   st.engineVersion=9;st.ghostMood='curious';st.ghostReply='';st.activityDone=false;
  }
  if(!st.engineVersion&&st.status==='in_progress'){
   if(['action_ready','action_result','later_question','time_action'].includes(st.currentStep))st.currentStep=st.currentStep==='later_question'||st.currentStep==='time_action'?'saved_followup':Number(st.remainingQuantity)>0?'leftover_question':'ghost_chat';
   st.ghostMood=st.ghostMood||'curious';st.chatRound=st.chatRound||0;
  }
  if(st.recap&&st.recap.saved===undefined&&st.recap.remaining!==undefined){const qty=st.recap.remaining||'0',how=st.recap.disposition;
   st.recap.saved=how==='store'||how==='keep'?qty:'0';st.recap.discarded=how==='risk'?qty:'0';st.recap.open=['store','keep','risk','all','share'].includes(how)?'0':qty;
  }
  if('sharedQuantity'in st)continue;
  if(st.simulationStatus==='not_simulated'){st.sharedQuantity=null;continue;}
  st.sharedQuantity=s.storyActions.filter(a=>a.storyId===st.id&&a.kind==='share'&&a.status==='applied').reduce((n,a)=>add(n,a.selectedQuantity),'0');
  const it=s.purchaseItems.find(x=>x.id===st.purchaseItemId);st.remainingQuantity=sub(sub(it.quantity,st.usedQuantity),st.sharedQuantity);
  if(st.recap)st.recap=deriveRecap(st,it);
 }
 return s;
}
export function validateState(s){
 for(const table of ['foodItems','purchases','purchaseItems','stories','storyActions'])if(new Set(s[table].map(x=>x.id)).size!==s[table].length)fail('stateError');
 for(const st of s.stories){const it=s.purchaseItems.find(x=>x.id===st.purchaseItemId);if(!it)fail('stateError');if(st.simulationStatus==='not_simulated'){if(st.usedQuantity!==null||st.remainingQuantity!==null||st.recap!==null)fail('stateError');}else if(cmp(sub(sub(it.quantity,st.usedQuantity),st.sharedQuantity||'0'),st.remainingQuantity)!==0)fail('stateError');}
 return true;
}
export function executeCommand(s,c){
 if(s.schemaVersion!==1)fail('schemaError');if(s.epoch!==c.epoch)fail('epochError');
 const signature=JSON.stringify({type:c.type,payload:c.payload});const old=s.appliedOperations[c.operationId];
 if(old){if(old.signature!==signature)fail('operationError');return {state:normalizeState(clone(s)),result:clone(old.result),replayed:true};}
 if(s.revision!==c.expectedRevision)fail('conflict');
 const out=reduceCommand(s,c);out.state.revision=s.revision+1;out.state.appliedOperations[c.operationId]={signature,result:out.result};return out;
}
