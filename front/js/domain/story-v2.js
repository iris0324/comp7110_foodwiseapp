import {half,sub,add,cmp,qty} from '../core/values.js?v=13.0';
const zero='0';
function take(st,item,amount){st.usedQuantity=amount;st.remainingQuantity=sub(item.quantity,amount);st.ghostMood=cmp(st.remainingQuantity,zero)>0?'thinking':'happy';}
function recalc(st,item){const left=sub(sub(item.quantity,st.usedQuantity),st.sharedQuantity);const kind=st.disposition?.kind||'open';const discarded=kind==='discard'?left:zero;const saved=kind==='save'?left:zero;const open=['discard','save'].includes(kind)?zero:left;return {name:item.name,quantity:item.quantity,used:st.usedQuantity,shared:st.sharedQuantity,saved,discarded,open,remaining:sub(left,discarded),disposition:kind,timePassed:st.timePassed};}
function answer(st,key,value,now){st.answers.push({questionKey:key,value,order:st.answers.length+1,confirmedAt:now});}
function beginActivity(st){st.currentStep='ghost_activity';st.ghostMood=st.disposition?.kind==='discard'?'worried':st.disposition?.kind==='share'?'relieved':st.disposition?.kind==='save'?'curious':st.disposition?.kind==='open'?'thinking':'happy';}
export function beginStory(st,item,template,source='preset',text=''){
 Object.assign(st,{source,template,engineVersion:9,customText:text,status:'in_progress',simulationStatus:'pending',currentStep:template==='time'?'storage_place':template==='quantity'?'quantity_question':'amount_question',usedQuantity:zero,sharedQuantity:zero,remainingQuantity:item.quantity,disposition:null,timePassed:false,answers:[],activeActionId:null,recap:null,ghostMood:'curious',ghostReply:'',chatRound:0,completedAt:null,storagePlace:null,storageWhen:null,activityDone:false});
}
export function advanceStory(st,item,value,now){
 if(st.status!=='in_progress')throw Error('stateError');const step=st.currentStep;
 const allowed={amount_question:null,quantity_question:null,storage_place:['fridge','freezer','pantry','unsure'],storage_when:['soon','days','later','unsure'],storage_fate:['use','share','save','discard','unsure'],leftover_question:['save','share','discard','unsure'],saved_followup:['use_later','share_later','keep_later','discard_later'],quantity_remainder:['save','share','discard','unsure'],ghost_activity:['activity_done']};
 if(!(step in allowed)||(allowed[step]&&!allowed[step].includes(value)))throw Error('stateError');
 if(step==='quantity_question'){
  if(!/^qty:\d+(?:\.\d{1,6})?$/.test(value))throw Error('quantityError');const amount=qty(value.slice(4));if(cmp(amount,item.quantity)>0)throw Error('quantityError');answer(st,step,value,now);take(st,item,amount);st.currentStep=cmp(st.remainingQuantity,zero)>0?'quantity_remainder':'ghost_activity';return;
 }
 if(step==='amount_question' && !['none','half','all'].includes(value) && !/^amount:\d+(?:\.\d{1,6})?$/.test(value))throw Error('quantityError');
 answer(st,step,value,now);
 if(step==='amount_question') {
   const chosen=value==='none'?zero:value==='half'?half(item.quantity):value==='all'?item.quantity:/^amount:\d+(?:\.\d{1,6})?$/.test(value)?qty(value.slice(7)):null;
   if(chosen===null||cmp(chosen,item.quantity)>0)throw Error('quantityError');
   take(st,item,chosen);st.currentStep=cmp(st.remainingQuantity,zero)>0?'leftover_question':'ghost_activity';return;
 }
 if(step==='storage_place'){st.storagePlace=value;st.currentStep='storage_when';st.ghostMood='curious';return;}
 if(step==='storage_when'){st.storageWhen=value;st.timePassed=value!=='soon';st.currentStep='storage_fate';st.ghostMood=value==='unsure'?'thinking':'curious';return;}
 if(step==='storage_fate'){
   if(value==='use')take(st,item,item.quantity);
   if(value==='share'){st.sharedQuantity=item.quantity;st.remainingQuantity=zero;}
   if(value==='save')st.disposition={kind:'save'};
   if(value==='discard')st.disposition={kind:'discard'};
   if(value==='unsure')st.disposition={kind:'open'};
   beginActivity(st);return;
 }
 if(['leftover_question','quantity_remainder'].includes(step)){
   if(value==='share'){st.sharedQuantity=add(st.sharedQuantity,st.remainingQuantity);st.remainingQuantity=zero;st.disposition={kind:'share'};}
   else st.disposition={kind:value==='save'?'save':value==='discard'?'discard':'open'};
   if(value==='save'&&step==='leftover_question'){st.currentStep='saved_followup';st.ghostMood='curious';}else beginActivity(st);
   return;
 }
 if(step==='saved_followup'){
   if(value==='use_later'){st.usedQuantity=add(st.usedQuantity,st.remainingQuantity);st.remainingQuantity=zero;st.disposition={kind:'all'};}
   if(value==='share_later'){st.sharedQuantity=add(st.sharedQuantity,st.remainingQuantity);st.remainingQuantity=zero;st.disposition={kind:'share'};}
   if(value==='discard_later')st.disposition={kind:'discard'};
   if(value==='keep_later')st.disposition={kind:'save'};
   st.timePassed=true;beginActivity(st);return;
 }
 if(step==='ghost_activity') {st.activityDone=true;st.simulationStatus='simulated';st.recap=recalc(st,item);st.currentStep='recap';return;}
}
export function advanceLaterAmount(st,item,value,now){if(st.currentStep!=='later_amount'||!['none','half','all'].includes(value))throw Error('stateError');answer(st,'later_amount',value,now);take(st,item,value==='none'?zero:value==='half'?half(item.quantity):item.quantity);st.currentStep=cmp(st.remainingQuantity,zero)>0?'leftover_question':'ghost_activity';}
export function finalizeRecap(st,item){st.simulationStatus='simulated';st.recap=recalc(st,item);st.currentStep='recap';}
