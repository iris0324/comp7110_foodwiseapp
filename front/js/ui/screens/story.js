import {t,getLanguage} from '../../i18n/index.js?v=13.0';
import {esc} from '../dom.js?v=13.0';
import {title,btn,nav,field} from '../components.js?v=13.0';
import {getStory,getOutcome,contribution} from '../../domain/selectors.js?v=13.0';
import {half,cmp,qty,sub,proportionalCents,money} from '../../core/values.js?v=13.0';
const L=(en,cn)=>getLanguage()==='zh'?cn:en;
const face=m=>`<img class="ghost-expression" src="assets/ghosty/${esc(m||'curious')}.png" alt="Ghosty">`;
const option=(id,en,cn,ico='♡')=>`<button type="button" class="story-answer" data-action="answer" data-value="${esc(id)}"><span class="answer-symbol">${ico}</span><span>${L(en,cn)}</span><span class="answer-chevron">›</span></button>`;
function kind(item){const n=item.name.toLowerCase();return /choco|巧克力|cookies|biscuit|餅乾|饼干|chips|crisps|零食/.test(n)?'snack':/bread|麵包|面包/.test(n)?'bread':/milk|yogurt|yoghurt|juice|優格|酸奶|牛奶|果汁/.test(n)?'fresh':'food';}
function prompt(item,st){const route=st.template,step=st.currentStep,k=kind(item);
 if(step==='amount_question')return L(`Let's imagine you've brought ${item.name} home!`,`想像你已經把${item.name}帶回家了！`);
 if(step==='quantity_question')return L(`You've got ${item.quantity} on your list. Let's see where they'd go.`,`你打算買 ${item.quantity} 件，我們看看它們會怎麼使用吧。`);
 if(step==='storage_place')return L(`Let's find a place for ${item.name}.`,`來幫${item.name}找個合適的地方吧。`);
 if(step==='storage_when')return L(k==='fresh'?`There's your ${item.name}. When might you have it?`:`All tucked away! When might you use it?`,k==='fresh'?`${item.name}放好了，你大概什麼時候會享用呢？`:'收好了！你大概何時會使用？');
 if(step==='storage_fate')return L(`Some time has passed. What do you imagine doing with it?`,'時間過去了，你覺得接下來會怎麼處理？');
 if(step==='leftover_question')return L(`Okay, what shall we do with what's left?`,'好，那剩下的部分怎麼安排呢？');
 if(step==='quantity_remainder')return L(`There are still some left. Where should they go?`,'還有一些沒用到，要怎麼安排呢？');
 if(step==='saved_followup')return L(k==='fresh'?`We kept it for later. What happens next?`:`We put it away. What happens later?`,k==='fresh'?'我們先把它收好了，接下來呢？':'先留起來了，之後怎麼樣？');
 if(step==='ghost_activity'){
   if(route==='quantity')return L('Help me sort these into the right places!','幫我把這些商品放到合適的位置吧！');
   if(route==='time')return L('A little time has passed. Let’s see what happens!','過了一段時間，一起看看接下來怎麼樣！');
   const d=st.disposition?.kind;
   if(d==='share')return L('Can you pass this little portion along?','可以把這份食物分享出去嗎？');
   if(d==='save')return L('Help me put the rest away for later.','幫我把剩下的收好吧。');
   if(d==='discard')return L('Sometimes food ends up here. Let’s see the outcome.','有時食物最後會被丟掉，我們看看結果吧。');
   return L('Come on, let’s see what happened to this food!','來吧，一起看看食物最後去了哪裡！');
 }
 return L('Ready?','準備好了嗎？');
}
const strip=(s,it)=>{const p=s.purchases.find(x=>x.id===it.purchaseId);return `<div class="item-strip story-item-info"><div><strong>${esc(it.name)}</strong><small>${L('Quantity','數量')} ${esc(it.quantity)}</small></div>${p.itemIds.length>1?`<button class="mini-link" data-go="choose-item" data-id="${esc(p.id)}">${L('Choose an Item','選擇商品')}</button>`:''}</div>`;};
const stage=(it,st)=>`<section class="ghost-dialogue mood-${esc(st.ghostMood||'curious')}"><div class="ghost-stage-art">${face(st.ghostMood||'curious')}</div><div class="ghost-bubble"><span class="ghost-tag">GHOSTY</span><p>${esc(prompt(it,st))}</p></div></section>`;
function activity(it,st,played=false){
 const route=st.template;
 const total=Number(it.quantity),used=Number(st.usedQuantity||0),shared=Number(st.sharedQuantity||0);
 // Share answers transfer the shared portion; other answers transfer ONLY the remainder.
 const remaining=Math.max(0,total-used-shared);
 const portion=shared>0?shared:remaining;
 const amount=String(Number(portion.toFixed(6)));
 const unit=it.unit?` ${esc(it.unit)}`:'';
 const hasFood=portion>0;
 const disposition=st.disposition?.kind||'open';
 const action=hasFood?disposition:'all';
 const destinations={
   discard:{icon:'bin',en:'Into the bin',zh:'丟進垃圾桶',mood:'worried'},
   share:{icon:'share',en:'Shared with someone',zh:'分享給別人',mood:'relieved'},
   save:{icon:'store',en:'Put away safely',zh:'妥善保存',mood:'happy'},
   open:{icon:'hold',en:'Held by Ghosty',zh:'由 Ghosty 暫時接住',mood:'thinking'},
   all:{icon:'heart',en:'All used',zh:'全部使用完畢',mood:'happy'}
 };
 const dest=destinations[action]||destinations.open;
 const label=L('Help Ghosty with the food','和 Ghosty 一起處理食物');
 const spriteName=/^(bag|milk|chocolate|banana|tomato)$/.test(it.asset||'')?it.asset:'bag';
 const photo=`<img src="assets/food-${spriteName}.png" draggable="false" alt="">`;
 const source=hasFood?`<button class="ghost-handover-food" type="button" data-handover-food aria-label="${L('Drag the remaining food to Ghosty','把剩下的食物拖給 Ghosty')}" ${played?'disabled':''}>${photo}<span>${esc(it.name)}</span><strong>${esc(amount)}${unit}</strong></button>`:
 `<div class="ghost-no-remainder"><strong>${L('Nothing left to hand over','沒有剩餘食物需要交給 Ghosty')}</strong></div>`;
 const guidance=played?{
  discard:L(`Ghosty received ${amount}${unit} and put it in the bin.`,`Ghosty 接住 ${amount}${unit}，親自放進垃圾桶。`),
  share:L(`Ghosty received ${amount}${unit} and shared it.`,`Ghosty 接住 ${amount}${unit}，再分享出去。`),
  save:L(`Ghosty received ${amount}${unit} and put it away.`,`Ghosty 接住 ${amount}${unit}，再收好保存。`),
  open:L(`Ghosty is holding ${amount}${unit}.`,`Ghosty 正幫你拿著 ${amount}${unit}。`),
  all:L('All used — nothing to give Ghosty.','已全部使用，不需要交付剩餘食物。')
 }[action]:hasFood?L(`Drag ${amount}${unit} to Ghosty above.`,`把 ${amount}${unit} 拖到上方的 Ghosty。`):L('All used — ready for your result.','全部使用完畢，可以查看結果。');
 return `<section class="ghost-activity ghost-activity-${esc(route)} ${played?'activity-complete':''}" data-story-activity aria-label="${label}">
 <div class="eyebrow">GHOSTY</div>
 <h2 class="activity-title">${L('Let Ghosty help','讓 Ghosty 來幫忙')}</h2>
 <p class="activity-intro">${esc(prompt(it,st))}</p>
 <div class="handover-summary">${L('Originally','原本')} <strong>${esc(it.quantity)}${unit}</strong><span>·</span>${L('Used','已使用')} <strong>${esc(st.usedQuantity||'0')}${unit}</strong><span>·</span>${L('To Ghosty','交給 Ghosty')} <strong>${esc(hasFood?amount:'0')}${unit}</strong></div>
 <div class="handover-scene" data-route="${esc(route)}" data-disposition="${esc(action)}">
   <div class="handover-receiver" data-handover-target aria-label="Ghosty">
     <img class="handover-ghost" src="assets/ghosty/${esc(played?dest.mood:'curious')}.png" draggable="false" alt="Ghosty">
     <span class="ghost-receive-label">Ghosty</span>
   </div>
   ${played&&hasFood?`<div class="ghosty-action-path" aria-label="${L(dest.en,dest.zh)}"><span class="ghosty-carry" aria-hidden="true">${photo}</span><img class="ghosty-destination-image" src="assets/story-actions/${dest.icon}.svg" alt=""><span class="ghosty-destination-label">${L(dest.en,dest.zh)}</span></div>`:''}
 </div>
 ${hasFood&&!played?`<div class="handover-source">${source}<span class="handover-arrow" aria-hidden="true">↑</span></div>`:''}
 ${!hasFood?`<div class="ghost-no-remainder">${L('Nothing left to hand over','沒有剩餘食物需要交給 Ghosty')}</div>`:''}
 <p class="handover-instruction" role="status">${guidance}</p>
 ${played||!hasFood?`<button class="button coral" data-action="answer" data-value="activity_done" ${played?'data-animated-result disabled':''}>${L('See Story Result','查看故事結果')}</button>`:
 `<button class="button outline activity-accessible" data-action="play-ghost">${L('Give the remaining food to Ghosty','將剩餘食物交給 Ghosty')}</button>`}
 </section>`;
}
export function buyLessPreview(item,plannedTotalCents,raw){
 if(raw===undefined||raw===null||String(raw).trim()==='')return `<p>${L('Enter the quantity you would actually buy to see your savings.','輸入最後要買的數量，立即查看預估節省。')}</p>`;
 try{
  const final=qty(raw,true);
  if(cmp(final,item.quantity)>=0)return `<p class="usage-preview-error">${L('Buy Less needs a quantity greater than 0 and below the original.','少買數量必須大於 0、少於原計畫。')}</p>`;
  if(plannedTotalCents===null)return `<p>${L('Price is needed to calculate savings.','需要價格才能計算節省。')}</p>`;
  const saved=proportionalCents(plannedTotalCents,sub(item.quantity,final),item.quantity);
  return `<div><span>${L('Planned','原計畫')} <b>${esc(item.quantity)}</b> · ${L('Final','最後買')} <b>${esc(final)}</b></span><span>${L('Planned total','原計畫總價')} <b>AUD $${money(plannedTotalCents)}</b></span><span>${L('Final estimated cost','最後預估花費')} <b>AUD $${money(plannedTotalCents-saved)}</b></span><span class="savings-preview-sum">${L('Estimated savings','預估節省')} <b>AUD $${money(saved)}</b></span></div>`;
 }catch{return `<p class="usage-preview-error">${L('Enter a valid quantity.','請輸入有效購買數量。')}</p>`;}
}
export function useAmountPreview(item,raw){
 if(raw===undefined||raw===null||String(raw).trim()==='')return `<span>${L('Enter an amount to preview how much remains.','輸入使用量，立即預覽剩餘多少。')}</span>`;
 try{
  const used=qty(raw);if(cmp(used,item.quantity)>0)return `<span class="usage-preview-error">${L('The amount cannot exceed the planned quantity.','使用量不能超過原本數量。')}</span>`;
  const remain=sub(item.quantity,used),unit=item.unit?' '+esc(item.unit):'';
  return `<div><span>${L('You would use','你會使用')} <strong>${esc(used)}${unit}</strong></span><span>${L('Left for Ghosty','剩下交給 Ghosty')} <strong>${esc(remain)}${unit}</strong></span></div>`;
 }catch{return `<span class="usage-preview-error">${L('Enter a number from zero to the planned quantity.','請輸入 0 到原本數量之間的數字。')}</span>`;}
}
function manualUse(it,e){return `<form class="story-custom-quantity" data-form="story-use" novalidate><label class="field"><span>${L('Enter exactly how much you would use','自行輸入實際使用量')} (${L('max','最多')} ${esc(it.quantity)}${it.unit?' '+esc(it.unit):''})</span><input inputmode="decimal" type="number" step="any" min="0" max="${esc(it.quantity)}" data-bind="fields.useQuantity" value="${esc(e?.fields?.useQuantity??'')}" placeholder="${L('e.g. 0.7','例如 0.7')}" required></label><div class="usage-live-preview" id="usage-preview" role="status">${useAmountPreview(it,e?.fields?.useQuantity)}</div><button class="button coral" type="submit">${L('Confirm my amount','確認我使用的數量')}</button></form>`;}
function outcome(it,st){
 const r=st.recap;if(!r)return '';
 const segments=[['used',L('Had','已享用'),'#DDA5B6'],['shared',L('Shared','已分享'),'#F8E2D8'],['saved',L('Saved','已保存'),'#F5DCE5'],['discarded',L('Discarded','已丟棄'),'#75646D'],['open',L('Undecided','未決定'),'#F4E7ED']].filter(([k])=>Number(r[k]||0)>0);
 const disposition=Number(r.discarded)>0?'discard':Number(r.shared)>0?'share':Number(r.saved)>0?'save':'all';
 const ghostMood=disposition==='discard'?'worried':disposition==='share'?'relieved':'happy';
 const resultPhrase=disposition==='discard'?L('Ghosty put the remaining portion in the bin.','Ghosty 把剩餘的食物丟進垃圾桶。'):disposition==='share'?L('Ghosty helped share what was left.','Ghosty 幫忙把剩下的食物分享出去。'):disposition==='save'?L('Ghosty helped put the rest away.','Ghosty 幫忙把剩下的食物收好。'):L('Here is what happened in your story.','這是你在故事中選擇的結果。');
 return `<section class="results-panel"><div class="eyebrow">${L('STORY RESULT','故事結果')}</div><h1>${L('Where Did Your Food Go?','你的食物最後去了哪裡？')}</h1><p class="subtitle">${esc(it.name)} · ${L('Based on your story choices','根據你在故事中的選擇')}</p><div class="outcome-bar" role="img" aria-label="${L('Food outcome proportions','食物去向比例')}">${segments.map(([k,_,color])=>`<span style="width:${Number(r[k])/Number(it.quantity)*100}%;background:${color}"></span>`).join('')}</div><div class="outcome-lines">${segments.map(([k,label,color])=>`<div class="outcome-line"><span class="outcome-dot" style="background:${color}"></span><span>${label}</span><strong>${esc(r[k])} / ${esc(it.quantity)}</strong></div>`).join('')}</div><div class="ghost-result-visual"><img src="assets/ghosty/${ghostMood}.png" alt="Ghosty"><div class="ghost-result-caption">${disposition!=='all'?`<img class="ghost-result-action" src="assets/story-actions/${disposition==='discard'?'bin':disposition==='share'?'share':'store'}.svg" alt="">`:''}<p>${esc(resultPhrase)}</p></div></div></section>`;
}
function next(s,it){const p=s.purchases.find(x=>x.id===it.purchaseId);return p.itemIds.some(id=>id!==it.id&&getStory(s,id)?.status!=='completed')?`<button class="button coral" data-go="choose-item" data-id="${esc(p.id)}">${L('Start Next Story','開始下一件商品的故事')}</button>`:`<button class="button coral" data-go="ghost-home">${L('Done for Now','暫時完成')}</button>`;}
export function storyScreen({s,r,e,played=false}){const it=s.purchaseItems.find(x=>x.id===r.id),st=getStory(s,r.id);if(!it||!st)return nav('back','ghost-home');const o=getOutcome(s,it.id),head=strip(s,it);
 if(r.page==='custom')return head+title('customTitle',t('story'))+`<form data-form="custom" novalidate>${field('fields.text','customText',e.fields.text,{area:true,help:'customHelp'})}${field('fields.template','chooseTemplate',e.fields.template,{options:[['','chooseTemplate'],['amount','amount'],['quantity','quantityTemplate'],['time','time']]})}<button class="button">${L('Start My Story','開始我的故事')}</button></form>`;
 if(st.status==='completed')return head+`<section class="neutral-finish">${face('happy')}<h1>${L('Story Completed','故事完成')}</h1><p>${o.intention==='still_want'?L('You decided to stick with your plan.','你決定照原計畫購買。'):L('Your decision is saved.','已保存你的決定。')}</p></section>`+next(s,it)+nav('viewDetails','detail',it.id,'outline');
 if(['source','custom_edit'].includes(st.currentStep))return head+`<h1>${L('Choose Your Story','選擇故事')}</h1><p class="story-choice-intro">${L('Pick a story to experience with Ghosty.','選一個故事，和 Ghosty 一起體驗吧。')}</p>`+[['amount','Consumption Amount','使用份量','How much would you have?','會吃／喝多少？'],['quantity','Purchase Quantity','購買數量','How many would you use?','你會用掉幾件？'],['time','Storage & Time','保存與時間','Where and when would you use it?','你會怎麼保存、何時使用？']].map(([key,en,cn,subE,subC])=>`<button class="story-option story-illustrated" data-action="start-story" data-value="${key}"><img src="assets/story-cards/${key==='time'?'time':key}.png" alt=""><span class="grow"><strong>${L(en,cn)}</strong><small>${L(subE,subC)}</small></span><span class="chevron">›</span></button>`).join('')+nav('custom','custom',it.id,'story-custom');
 if(st.currentStep==='recap')return head+outcome(it,st)+`<button class="button outline story-previous" data-action="story-back">${L('Previous Step','上一步')}</button><button class="button coral" data-action="continue-story">${L('Continue','繼續')}</button>`;
 if(st.currentStep==='intention')return head+`<button class="button outline story-previous" data-action="story-back">${L('Previous Step','上一步')}</button><div class="eyebrow">${L('YOUR DECISION','你的購買決定')}</div><h1>${L('What Will You Do Next?','接下來你會怎麼做？')}</h1><p class="subtitle">${L('Choose what works for you.','選擇適合自己的方式就好。')}</p>`+option('dont_buy',"Don't Buy",'這次不買','○').replace('data-action="answer"','data-action="intention"')+option('buy_less','Buy Less','少買一點','½').replace('data-action="answer"','data-action="intention"')+option('as_planned','Buy as Planned','照原計畫買','✓').replace('data-action="answer"','data-action="intention"')+(o.intention==='buy_less'?`<section class="question-card"><h2>${L('How many would you buy?','你打算買多少？')}</h2><form data-form="reduction">${field('fields.finalQuantity','finalQuantity',e?.fields?.finalQuantity??'')}<div id="buy-less-preview" class="buy-less-preview" role="status">${buyLessPreview(it,o.estimateCents,e?.fields?.finalQuantity)}</div><button class="button coral">${L('Confirm','確認')}</button></form></section>`:'');
 const step=st.currentStep;let heading='',choices='';
 if(step==='amount_question'){
 heading=L('How much would you have right now?','你現在會吃／喝多少？');
 choices=option('none','None right now','現在先不吃／喝','○')+option('half','Half','一半','½')+option('all','All of it','全部','●');
  choices+=manualUse(it,e);
 }
 else if(step==='quantity_question'){
  heading=L('How many would you actually use?','你覺得會用掉多少？');
  const n=Number(it.quantity);
  const vals=[['qty:0',L('None','不用'), '○'],[`qty:${Number((n/2).toFixed(6))}`,L('Half','一半'),'½'],[`qty:${it.quantity}`,L('All','全部'),'●']];
  choices=vals.filter((v,i)=>vals.findIndex(w=>w[0]===v[0])===i).map(([key,label,mark])=>`<button class="story-answer" data-action="answer" data-value="${key}"><span class="answer-symbol">${mark}</span><span>${label}</span><span class="answer-chevron">›</span></button>`).join('');
  choices+=manualUse(it,e);
 }
 else if(step==='quantity_remainder'){heading=L('What would you do with the extra items?','其他還沒用到的商品怎麼安排？');choices=option('save','Keep them for later','留到以後','▧')+option('share','Share with someone','分享給別人','♡')+option('discard','Throw them away','丟棄','×')+option('unsure','Not sure yet','還不確定','?');}
 else if(step==='leftover_question'){heading=L(Number(st.usedQuantity)>0?'What would you do with the rest?':'What would you do with it?','剩下的部分要怎麼處理？');choices=option('save','Save it for later','留到之後','▧')+option('share','Share it with someone','分享給別人','♡')+option('discard','Throw it away','丟掉','×')+option('unsure','Not sure yet','還不確定','?');}
 else if(step==='saved_followup'){heading=L('What happens to the saved portion later?','後來保存的食物怎麼樣了？');choices=option('use_later','I have it later','之後吃／喝了','♡')+option('share_later','I share it later','之後分享了','♡')+option('keep_later','It stays saved','仍然保存著','▧')+option('discard_later','I end up throwing it away','最後丟掉了','×');}
 else if(step==='storage_place'){heading=L('Where would you keep it?','你會把它放在哪裡？');const k=kind(it);choices=(k==='fresh'?option('fridge','In the fridge','冰箱冷藏','▧')+option('freezer','In the freezer','冷凍庫','❄'):k==='bread'?option('pantry','In the cupboard','櫥櫃／常溫','□')+option('freezer','In the freezer','冷凍庫','❄'):option('pantry','In the cupboard','櫥櫃／常溫','□')+option('fridge','In the fridge','冰箱冷藏','▧'))+option('unsure','Not sure yet','還不確定','?');}
 else if(step==='storage_when'){heading=L('When would you use it?','你打算何時使用？');choices=option('soon','Soon','很快就使用','♡')+option('days','In a few days','幾天後','◷')+option('later','Much later','過一段時間','◷')+option('unsure','Not sure','還不確定','?');}
 else if(step==='storage_fate'){heading=L('What happens to it then?','那時候你會怎麼處理它？');choices=option('use','Have it','吃／喝掉','♡')+option('share','Share it','分享','♡')+option('save','Keep it longer','繼續保存','▧')+option('discard','Throw it away','丟掉','×')+option('unsure','Not sure yet','還不確定','?');}
 if(step==='ghost_activity')return head+activity(it,st,played)+`<button class="button outline story-previous" data-action="story-back">${L('Previous Step','上一步')}</button>`;
 return head+stage(it,st)+`<section class="question-card story-question"><div class="eyebrow">${L('YOUR STORY','你的故事')}</div><h2>${heading}</h2>${['amount_question','quantity_question'].includes(step)?'<p class="shortcut-heading">'+L('Quick options or choose your own amount below','快捷選項，或在下方自行輸入任意使用量')+'</p>':''}${choices}</section>`+`<button class="button outline story-previous" data-action="story-back">${L('Previous Step','上一步')}</button>`;
}
export function actionPreview(){return '';}
