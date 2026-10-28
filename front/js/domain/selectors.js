import {daysUntil,nameKey,proportionalCents,sub,qty,cmp} from '../core/values.js?v=13.0';
export const getStory=(s,itemId)=>s.stories.find(x=>x.purchaseItemId===itemId);
export const getOutcome=(s,itemId)=>s.outcomes.find(x=>x.purchaseItemId===itemId);
// One source of truth for Savings Result, My Savings and History.
// Original estimate is ALWAYS the total amount for the planned quantity.
// If a price was entered per unit, it is converted to a total at checkout.
export function purchaseBreakdown(outcome,item){
 if(!outcome||!item||outcome.estimateCents===null||!Number.isSafeInteger(outcome.estimateCents))return null;
 const original=qty(item.quantity,true);
 let finalQuantity=original;
 if(outcome.intention==='leave_for_now')finalQuantity='0';
 else if(outcome.intention==='buy_less'){
  if(!outcome.reductionQuantity)return null;
  finalQuantity=sub(original,outcome.reductionQuantity);
  if(cmp(finalQuantity,'0')<=0||cmp(finalQuantity,original)>=0)return null;
 }
 const savedCents=proportionalCents(outcome.estimateCents,sub(original,finalQuantity),original);
 const finalCostCents=outcome.estimateCents-savedCents;
 return {originalQuantity:original,finalQuantity,plannedTotalCents:outcome.estimateCents,finalCostCents,savedCents};
}
export const contribution=(o,item)=>purchaseBreakdown(o,item)?.savedCents??null;
export const unspent=s=>s.outcomes.reduce((n,o)=>{const st=getStory(s,o.purchaseItemId);return n+(st?.status==='completed'&&(o.intention==='leave_for_now'||o.intention==='buy_less')?(contribution(o,s.purchaseItems.find(x=>x.id===o.purchaseItemId))??0):0);},0);
export const cartTotal=items=>({total:items.reduce((n,x)=>n+(x.estimateCents??0),0),unknown:items.filter(x=>x.estimateCents===null).length});
export function foodList(s,{search='',category='',status='available'}={}){const deadline=Number(s.settings.nearDateDays||5);return s.foodItems.filter(x=>(status==='past'?x.status!=='available':x.status===status)&&(!category||x.category===category)&&nameKey(x.name).includes(nameKey(search))).sort((a,b)=>{
 if(!!a.isStarred!==!!b.isStarred)return a.isStarred?-1:1;
 const ad=daysUntil(a.recordedDate),bd=daysUntil(b.recordedDate),au=ad!==null&&ad<=deadline,bu=bd!==null&&bd<=deadline;
 if(au!==bu)return au?-1:1;
 if(au&&bu)return ad-bd;
 return a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id);
});}
export const sameNames=(s,name)=>s.foodItems.filter(x=>x.status==='available'&&nameKey(x.name)===nameKey(name));
export const dateState=(s,base)=>{const n=daysUntil(s.recordedDate,base);return n===null?'unknown':n<0?'past':n===0?'today':n<=3?'near':'future';};
