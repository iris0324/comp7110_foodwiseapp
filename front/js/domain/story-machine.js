import {half,cmp,usageQty,sub,add,fail} from '../core/values.js?v=13.0';
export const templates=['amount','quantity','time'];
export const leftovers=['store','share','risk','uncertain'];
export function createStory(id,itemId,quantity){return {id,purchaseItemId:itemId,source:null,template:null,customText:'',storyRevision:1,status:'not_started',simulationStatus:'pending',answers:[],currentStep:'source',activeActionId:null,usedQuantity:'0',remainingQuantity:quantity,sharedQuantity:'0',disposition:null,timePassed:false,recap:null,completedAt:null};}
export function firstStep(template){return {amount:'amount_question',quantity:'quantity_question',time:'timing_question'}[template];}
export function choices(story){switch(story.currentStep){case 'amount_question':return ['none','half','all'];case 'quantity_question':return ['zero','partial','all'];case 'timing_question':return ['now','later','uncertain'];case 'later_question':return ['half','all','keep','risk','uncertain'];case 'leftover_question':return leftovers;default:return [];}}
export function prepareAnswer(story,item,value,context){
 if(story.status!=='in_progress')fail('stateError');
 const key=story.currentStep;let selected=value,amount='0',kind,next;
 if(key==='quantity_question'){amount=usageQty(value);if(cmp(amount,item.quantity)>0)fail('amountError');}
 else if(!choices(story).includes(value))fail('stateError');
 if(['amount_question','quantity_question','later_question'].includes(key)&&(['none','half','all'].includes(value)||key==='quantity_question')){
  if(key!=='quantity_question')amount=value==='all'?story.remainingQuantity:value==='half'?half(story.remainingQuantity):'0';
  if(cmp(amount,'0')===0)next='leftover_question';else {kind='feed';next=cmp(amount,story.remainingQuantity)===0?'recap':'leftover_question';}
 }else if(key==='timing_question'){
  if(value==='now')next='amount_question';else if(value==='later'){kind='store';next='time_action';}else {kind='uncertain';next='recap';}
 }else if(key==='later_question'||key==='leftover_question'){kind=value;next='recap';}
 else fail('stateError');
 story.answers.push({questionKey:key,value:selected,order:story.answers.length+1,confirmedAt:context.now});
 if(kind){const action={id:context.actionId,storyId:story.id,storyRevision:story.storyRevision,kind,selectedQuantity:kind==='feed'?amount:story.remainingQuantity,beforeUsed:story.usedQuantity,beforeRemaining:story.remainingQuantity,status:'waiting',nextStep:next,createdAt:context.now};story.activeActionId=action.id;story.currentStep='action_ready';return action;}
 story.currentStep=next;return null;
}
export function applyAction(story,action,now){
 if(story.status!=='in_progress'||story.storyRevision!==action.storyRevision||story.activeActionId!==action.id)fail('stateError');
 if(action.status==='applied')return;
 if(story.currentStep!=='action_ready')fail('stateError');
 if(['feed','share'].includes(action.kind)&& (cmp(action.selectedQuantity,'0')<=0||cmp(action.selectedQuantity,story.remainingQuantity)>0))fail('amountError');
 if(action.kind==='feed'){story.usedQuantity=add(story.usedQuantity,action.selectedQuantity);story.remainingQuantity=sub(story.remainingQuantity,action.selectedQuantity);}
 else if(action.kind==='share'){story.sharedQuantity=add(story.sharedQuantity||'0',action.selectedQuantity);story.remainingQuantity=sub(story.remainingQuantity,action.selectedQuantity);story.disposition={kind:'share',quantity:story.sharedQuantity};}
 else if(action.kind==='time')story.timePassed=true;
 else {story.disposition={kind:action.kind,quantity:story.remainingQuantity};if(action.kind==='risk')story.timePassed=true;}
 if(['feed','share'].includes(action.kind)){action.nextStep=cmp(story.remainingQuantity,'0')===0?'recap':'leftover_question';const answer=story.answers.at(-1);if(answer)answer.executedQuantity=action.selectedQuantity;}
 action.status='applied';action.afterUsed=story.usedQuantity;action.afterRemaining=story.remainingQuantity;action.appliedAt=now;story.currentStep='action_result';
}
export function deriveRecap(story,item){if(story.simulationStatus==='not_simulated')return null;return {name:item.name,quantity:item.quantity,used:story.usedQuantity,shared:story.sharedQuantity||'0',remaining:story.remainingQuantity,disposition:story.disposition?.kind|| (cmp(story.remainingQuantity,'0')===0?'all':'uncertain'),timePassed:story.timePassed};}
