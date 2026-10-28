import {Repository} from './storage/repository.js?v=13.0';
import {Store} from './app/store.js?v=13.0';
import {route,path} from './app/router.js?v=13.0';
import {entryPage,initialPage,ONBOARDING_KEY} from './app/onboarding.js?v=13.0';
import {clone,uid,money,cents,half,qty,sub,cmp,daysUntil,today,reductionQty} from './core/values.js?v=13.0';
import {cartFields,foodFields} from './domain/commands.js?v=13.0';
import {getStory,getOutcome} from './domain/selectors.js?v=13.0';
import {receiptServices} from './domain/receipt.js?v=13.1';
import {t,setLanguage,getLanguage} from './i18n/index.js?v=13.0';
import {esc,$} from './ui/dom.js?v=13.0';
import {icon,title,btn,nav,notice,sprite,resultKey,reductionSummary} from './ui/components.js?v=13.0';
import {foodScreen} from './ui/screens/food.js?v=13.1';
import {ghostScreen,sameNameCard,reductionPreview,cartPricePreview} from './ui/screens/ghost-v8.js?v=13.1';
import {storyScreen,actionPreview,useAmountPreview,buyLessPreview} from './ui/screens/story.js?v=13.0';
import {authScreen} from './ui/screens/auth.js?v=13.0';
import {bindFeed} from './interaction/feed.js?v=13.0';
import {Animator} from './interaction/animator.js?v=13.0';
import {CatalogService} from './services/catalog-service.js?v=13.0';
import {decodeQRPhoto} from './scanners/qr-scanner.js?v=13.0';
const store=new Store(new Repository());
const catalog=new CatalogService();
const animator=new Animator();
let motionSheetAvailable=true;let cartSaveTimer=null;let cameraStream=null;let cameraUnavailable=false;let cameraRequest=0;let activityPlayedKey='';
let guestEnteredThisLaunch=false;
let current=route(),editor=null,editorBaseline='',modal=null,modalFocus=null,cleanupFeed=()=>{},playing=null,phase='result',message='',generating=false,external=false,previewToken=0;
const filters={search:'',category:'',status:'available'};
const blankFood=()=>({name:'',quantity:'1',unit:'',category:'other',recordedDate:'',location:'',planDate:''});
const blankCart=()=>({cartItemId:uid(),name:'',quantity:'1',price:'',note:'',asset:'bag',priceMeaning:'total'});
const keyOf=r=>r.page+'/'+r.id;
function editorData(e){if(!e)return null;if(e.type==='receipt')return {id:e.id,rows:e.rows,imageId:e.imageId,sample:e.sample,qrPayload:e.qrPayload};if(e.type==='cart')return e.rows;return e.fields;}
function scheduleCartSave(){if(!editor||editor.type!=='cart'||current.page!=='cart'||store.pending)return;clearTimeout(cartSaveTimer);cartSaveTimer=setTimeout(()=>{cartSaveTimer=null;if(editor?.type==='cart'&&dirty()&&!store.pending)saveDraft();},700);}
function markBaseline(){editorBaseline=JSON.stringify(editorData(editor));}
function dirty(){return !!editor&&['cart','receipt','custom'].includes(editor.type)&&JSON.stringify(editorData(editor))!==editorBaseline;}
function releaseEditor(){
 previewToken++;
 if(editor?.imageUrl)URL.revokeObjectURL(editor.imageUrl);
 if(editor?.productPhotoUrl)URL.revokeObjectURL(editor.productPhotoUrl);
 if(editor?.photoUrls)Object.values(editor.photoUrls).forEach(url=>URL.revokeObjectURL(url));
 editor=null;
}
function restoreCartPhotos(ref){
 for(const item of ref.rows||[]){
  if(!item.photoId)continue;
  store.repository.getMedia(item.photoId).then(blob=>{
   if(!blob||editor!==ref)return;
   const url=URL.createObjectURL(blob);
   if(editor!==ref){URL.revokeObjectURL(url);return;}
   ref.photoUrls[item.cartItemId]=url;
   if(current.page==='cart')render();
  }).catch(()=>{});
 }
}
function prepareEditor(r){
 const s=store.state;
 if(r.page==='story'){const st=getStory(s,r.id);if(st?.currentStep==='custom_edit'||(st?.currentStep==='source'&&s.drafts.some(d=>d.type==='custom'&&d.targetId===r.id))){r.page='custom';history.replaceState(null,'',path('custom',r.id));}}
 if(['cart','ghost-add','product-camera','product-review'].includes(r.page)){
  if(editor?.type!=='cart'){releaseEditor();editor={type:'cart',rows:clone(s.cart),photoUrls:{}};markBaseline();restoreCartPhotos(editor);}
  if(['ghost-add','product-camera','product-review'].includes(r.page)&&!editor.rows.some(x=>x.cartItemId===r.id)){let row=blankCart();try{const saved=JSON.parse(localStorage.getItem('fw-pending-item')||'null');if(saved?.cartItemId===r.id)row=saved;}catch{}row.cartItemId=r.id||row.cartItemId;editor.rows.push(row);current.id=row.cartItemId;history.replaceState(null,'',path(r.page,row.cartItemId));}
  if(['ghost-add','product-review'].includes(r.page)){const row=editor.rows.find(x=>x.cartItemId===current.id);if(row?.productId)editor.scannedProduct=catalog.getProduct(row.productId);}
  return;
 }
 if(['receipt','receipt-camera'].includes(r.page)){
  const saved=s.receiptImports.find(x=>x.id===r.id&&x.status==='draft')||(!r.id?s.receiptImports.find(x=>x.status==='draft'):null);
  releaseEditor();editor={type:'receipt',id:saved?.id||uid(),rows:clone(saved?.rawRows||[]),imageId:saved?.imageId||null,sample:saved?!!saved.sample:false,qrPayload:saved?.qrPayload||null,receiptId:saved?.receiptId||null,storeName:saved?.storeName||null,receiptTotal:saved?.receiptTotal||null,imageUrl:null,blob:null,photoStatus:saved?.imageId?'ready':'',photoIssue:''};markBaseline();
  if(saved?.imageId){const ref=editor;store.repository.getMedia(saved.imageId).then(blob=>{if(editor===ref&&blob){editor.imageUrl=URL.createObjectURL(blob);render();}}).catch(()=>{if(editor===ref){message='previewError';render();}});}
  return;
 }
 if(r.page==='custom'){
  releaseEditor();const st=getStory(s,r.id);const draft=s.drafts.find(x=>x.type==='custom'&&x.targetId===r.id&&x.storyRevision===st?.storyRevision);editor={type:'custom',draftId:'custom-'+r.id+'-'+st?.storyRevision,fields:clone(draft?.fields||{text:st?.customText||'',template:st?.template||''})};markBaseline();return;
 }
 releaseEditor();
 const f=s.foodItems.find(x=>x.id===r.id),it=s.purchaseItems.find(x=>x.id===r.id);
 if(['food-new','food-edit','food-detail'].includes(r.page)){editor={type:'food',fields:f?{...clone(f),quantity:f.initialQuantity,remaining:f.remainingQuantity}:blankFood()};}
 if(r.page==='food-use')editor={type:'use',fields:{remaining:f?.remainingQuantity||''}};
 if(r.page==='food-plan')editor={type:'plan',fields:{planDate:f?.planDate||''}};
 if(r.page==='outcome'){const o=getOutcome(s,r.id);editor={type:'outcome',fields:{intention:o?.intention||'',finalQuantity:o?.intention==='buy_less'&&o.reductionQuantity?sub(it.quantity,o.reductionQuantity):'',price:o?.estimateCents===null?'':money(o?.estimateCents??null)}};}
 if(r.page==='story'&&it)editor={type:'amount',fields:{amount:half(it.quantity),reductionQuantity:getOutcome(s,r.id)?.reductionQuantity||''}};
 if(r.page==='story'&&editor?.type==='amount'){const st=getStory(s,r.id),a=s.storyActions.find(x=>x.id===st?.activeActionId);if(a){editor.actionId=a.id;editor.fields.selectedQuantity=a.selectedQuantity;}}
 markBaseline();
}
function haltMotion(){animator.cancel();playing=null;phase='result';}
function navigateNow(page,id='',replace=false){page=entryPage(page,guestEnteredThisLaunch);if(page==='welcome')id='';if(!['product-camera','receipt-camera'].includes(page))stopCamera();if(cartSaveTimer){clearTimeout(cartSaveTimer);cartSaveTimer=null;}haltMotion();modal=null;message='';store.error=null;current={page,id};history[replace?'replaceState':'pushState'](null,'',path(page,id));prepareEditor(current);render();window.scrollTo({top:0});$('#main')?.focus({preventScroll:true});}
function navigate(page,id=''){
 if(['ghost-add','product-review','product-camera'].includes(current.page)&&editor?.type==='cart'&&store.state){const row=editor.rows.find(x=>x.cartItemId===current.id),inCart=store.state.cart.some(x=>x.cartItemId===current.id);if(row&&!inCart){if(row.name||row.price||row.note||String(row.quantity)!=='1')try{localStorage.setItem('fw-pending-item',JSON.stringify(row));}catch{}editor.rows=editor.rows.filter(x=>x.cartItemId!==current.id);saveDraft(()=>navigateNow(page,id));return;}}
 if(store.status==='saving'||store.pending)return;
 if(keyOf(current)===keyOf({page,id}))return;
 if(dirty()&&editor?.type==='cart'){saveDraft(()=>navigateNow(page,id));return;}
 if(dirty()&&editor?.type==='receipt'){releaseEditor();navigateNow(page,id);return;}if(dirty()&&editor?.type==='custom'){saveDraft(()=>navigateNow(page,id));return;}
 navigateNow(page,id);
}
function openModal(value){modalFocus=document.activeElement?.id||null;modal=value;render();}
function closeModal(){modal=null;render();if(modalFocus)document.getElementById(modalFocus)?.focus();}
function context(){return {s:store.state,r:current,e:editor,filters,playing,phase,generating,motionSheetAvailable,catalog,played:activityPlayedKey===current.id+':'+(store.state.stories.find(x=>x.purchaseItemId===current.id)?.storyRevision||0)};}
function home(){return title('welcome','FoodWise')+`<div class="home-scene">${sprite('welcome','bob')}</div>`+`<button class="module-card food" data-go="food"><span class="module-icon">${icon('food')}</span><span><strong>${t('food')}</strong><small>${t('homeFood')}</small></span>${icon('arrow')}</button><button class="module-card ghost" data-go="ghost-home"><span class="module-icon">${icon('bag')}</span><span><strong>Ghost Buy</strong><small>${t('homeGhost')}</small></span>${icon('arrow')}</button>`;}
function settings(){
 const settings=store.state.settings;const page=current.page;
 const option=(label,help,k)=>`<div class="setting-row"><div class="grow"><strong>${label}</strong><small>${help}</small></div><button class="switch ${settings[k]?'on':''}" type="button" data-action="settings-toggle" data-value="${k}" role="switch" aria-checked="${!!settings[k]}" aria-label="${label}"><span></span></button></div>`;
 if(page==='food-help')return `<div class="eyebrow">${getLanguage()==='zh'?'食物管理':'FOOD MANAGEMENT'}</div><h1>${getLanguage()==='zh'?'食物管理使用說明':'How Food Management Works'}</h1><div class="help-page">${getLanguage()==='zh'?`<h2>新增食物</h2><p>你可以手動新增已經擁有的食物，或拍攝收據、從相簿選擇收據照片。辨識後請在確認與編輯頁核對名稱、數量和分類，也可以刪除或補上商品，再加入我的食物。</p><h2>日期與提醒</h2><p>到期日是選填資料，只有你提供日期才會出現到期提醒。加入天數固定按照你把商品加入 我的食物的時間計算，不一定等於實際購買日。已到期及即將到期的標示仍會在 我的食物內顯示，即使手機通知已關閉。</p><h2>管理清單</h2><p>你可以切換分類、為常用項目加星號、編輯數量、記錄已用完或丟棄。星號優先顯示，其次是即將到期的商品，再按照加入時間排列。完成或丟棄的項目會留在 過去紀錄。</p><h2>手機通知</h2><p>開啟後需要瀏覽器授權。頁面開啟時可顯示符合條件的提醒；關閉網頁後要可靠接收推播，未來仍需要推播服務支援。</p>`:`<h2>Add food</h2><p>Add food you already own manually, or take a receipt photo or choose one from your album. Check and edit the recognised items before adding them to My Food. You can edit, remove or add missing rows.</p><h2>Dates and reminders</h2><p>Expiry Date is optional and never guessed. Days Since Purchase is always shown and starts on the date you added the item to My Food, not necessarily the date it was purchased. Expiring and expired food is highlighted inside My Food even with phone notifications off.</p><h2>Manage what you have</h2><p>Filter by category, star important items, update amounts, record used or discarded food, and review Past Records. Starred items come first, followed by items that need attention, then older entries.</p><h2>Phone notifications</h2><p>Notifications require browser permission. Reminders can appear while the app is open; reliable notifications after closing the browser need future push-service support.</p>`}</div>`;
 if(page==='about')return `<div class="eyebrow">FOODWISE</div><h1>${getLanguage()==='zh'?'關於 FoodWise':'About FoodWise'}</h1><div class="help-page"><img src="assets/ghosty/happy.png" class="about-ghost" alt="Ghosty"><p>${getLanguage()==='zh'?'FoodWise 幫你管理家中已有的食物，也能在購買之前，透過 Ghost Buy 的虛擬故事看看不同選擇可能帶來的結果。':'FoodWise helps you manage food you already own. With Ghost Buy, you can explore different possibilities before making a purchase.'}</p><p>${getLanguage()==='zh'?'Food Management 幫助你查看食物、到期日期、數量及過去紀錄；Ghost Buy 讓你和 Ghosty 一起體驗商品的故事、理解可能的食物去向，再自行決定是否購買。':'Food Management keeps track of items, optional expiry dates, quantities and past records. Ghost Buy lets you explore a virtual story with Ghosty, see what might happen to your food, and choose what to buy—without pressure.'}</p><p>${getLanguage()==='zh'?'故事和預估節省都依照你的輸入計算，並不代表已驗證的實際購買或省錢成果。':'Story outcomes and estimated savings are based on your choices, not verified real-world purchases or financial savings.'}</p></div>`;
 if(page==='food-settings')return `<div class="eyebrow">${getLanguage()==='zh'?'食物管理':'FOOD MANAGEMENT'}</div><h1>${getLanguage()==='zh'?'食物管理設定':'Food Management Settings'}</h1><section class="setting-card"><h2>${getLanguage()==='zh'?'到期提醒':'Expiry Reminders'}</h2><p>${getLanguage()==='zh'?'提前幾天提醒？':'Remind Before Expiry'}</p><div class="reminder-options">${[1,3,5,7].map(n=>`<button data-action="reminder-days" data-value="${n}" class="chip ${settings.nearDateDays===n?'active':''}" aria-pressed="${settings.nearDateDays===n}">${n} ${getLanguage()==='zh'?'天':'days'}</button>`).join('')}</div>${option(getLanguage()==='zh'?'手機通知':'Phone Notifications',getLanguage()==='zh'?'是否允許瀏覽器在頁面開啟時顯示到期通知':'Allow expiry alerts when the app is open','phoneNotifications')}</section><section class="setting-card"><h2>${getLanguage()==='zh'?'幫助與關於':'Help & About'}</h2>${nav('howFoodWorks','food-help','','outline')}${nav('aboutFoodWise','about','','outline')}</section><section class="setting-card"><button class="button outline" data-action="exit-guest">${getLanguage()==='zh'?'退出訪客／返回登入':'Exit Guest / Back to Log In'}</button></section>`;
 return `<div class="eyebrow">GHOST BUY</div><h1>${getLanguage()==='zh'?'Ghost Buy 設定':'Ghost Buy Settings'}</h1><section class="setting-card">${option(getLanguage()==='zh'?'故事動畫':'Story Animations',getLanguage()==='zh'?'啟用故事中的非必要動畫':'Enable optional story movement','storyAnimations')}${option(getLanguage()==='zh'?'減少動態':'Reduce Motion',getLanguage()==='zh'?'減少動態與過場效果':'Limit movement and transitions','reduceMotion')}${option(getLanguage()==='zh'?'故事操作提示':'Story Guidance',getLanguage()==='zh'?'顯示可選的故事操作提示':'Show optional story guidance','storyGuidance')}</section><section class="setting-card"><button class="button outline" data-action="exit-guest">${getLanguage()==='zh'?'退出訪客／返回登入':'Exit Guest / Back to Log In'}</button></section>`;
}
function modalBody(){const m=modal;if(!m)return '';let content;
 if(m.type==='add-food')content=`<h2>${t('addFood')}</h2><div class="add-food-choices">${nav('takePhoto','receipt-camera','','coral')}${nav('manual','food-new','','outline')}</div><button type="button" class="add-food-close" data-action="modal-close">${t('close')}</button>`;
 if(m.type==='food-delete')content=`<h2>${getLanguage()==='zh'?'刪除此食品？':'Delete this food?'}</h2><p>${getLanguage()==='zh'?'此食品會永久從 My Food 移除，不會進入過去紀錄。此操作無法復原。':'This permanently removes the item from My Food without moving it into Past Records. This cannot be undone.'}</p><button type="button" class="button danger" data-action="confirm-food-delete">${getLanguage()==='zh'?'確認刪除':'Delete Food'}</button>${btn('cancel','modal-close','','outline')}`;
 if(m.type==='food-end')content=`<h2>${t('confirmEnd')}</h2><p>${t('confirmEndHelp')}</p><p><strong>${t(m.status)}</strong></p>${btn('saveChanges','confirm-food-end',m.status)}${btn('cancel','modal-close','','outline')}`;
 if(m.type==='zero')content=`<h2>${t('confirmZero')}</h2>${btn('usedUp','confirm-zero')}${btn('cancel','modal-close','','outline')}`;
 if(m.type==='revise')content=`<h2>${t('reviseTitle')}</h2><p>${t('reviseHelp')}</p>${btn('confirmRevise','confirm-revise',m.source?'source':'')}${btn('keepProgress','modal-close','','outline')}`;
 if(m.type==='reset')content=`<h2>${t('resetTitle')}</h2><p>${t('resetHelp')}</p>${btn('confirmReset','confirm-reset','','danger')}${btn('cancel','modal-close','','outline')}`;
 if(m.type==='switch'){const it=store.state.purchaseItems.find(x=>x.id===current.id),p=store.state.purchases.find(x=>x.id===it.purchaseId);content=`<h2>${t('switchItem')}</h2>`+p.itemIds.map(id=>{const item=store.state.purchaseItems.find(x=>x.id===id),st=getStory(store.state,id);return `<button class="food-card" data-go="story" data-id="${esc(id)}"><span class="grow"><strong>${esc(item.name)}</strong><small>${t(st.status)}</small></span></button>`;}).join('')+btn('close','modal-close','','outline');}
 if(store.pending&&store.status==='save_failed')content=`<div class="notice error" role="alert">${t(store.error||'saveError')}${btn('retry','retry','','outline')}${['conflict','epochError'].includes(store.error)?btn('reloadSaved','reload','','outline'):''}</div>`+content;
 return `<dialog id="modal" class="${m.type==='add-food'?'add-food-dialog':''}" ${m.type==='add-food'?'tabindex="-1"':''} aria-label="${t(m.type==='draft'?'draftTitle':m.type==='revise'?'reviseTitle':m.type==='reset'?'resetTitle':m.type==='switch'?'switchItem':m.type==='food-end'?'confirmEnd':m.type==='zero'?'confirmZero':'addFood')}">${content}</dialog>`;
}
function validReduction(raw){try{reductionQty(raw,store.state.purchaseItems.find(x=>x.id===current.id).quantity);return true;}catch{return false;}}
function invalidBinding(error){
 if(!editor)return null;const suffix=({nameError:'name',unitError:'unit',quantityError:'quantity',moneyError:'price',dateError:'recordedDate',textError:'text',templateError:'template'})[error];
 if(error==='reductionError')return editor.type==='outcome'&&editor.fields.actualResult==='bought_less'&&!validReduction(editor.fields.actualReductionQuantity)?'fields.actualReductionQuantity':'fields.reductionQuantity';
 if(error==='inventoryAmountError'||(editor.type==='food'&&error==='quantityError'&&editor.fields.remaining!==undefined)){try{qty(editor.fields.quantity,true);}catch{return 'fields.quantity';}return 'fields.remaining';}
 if(editor.type==='amount'&&['quantityError','amountError'].includes(error))return getStory(store.state,current.id)?.currentStep==='action_ready'?'fields.selectedQuantity':'fields.amount';
 if(editor.type==='use'&&['quantityError','remainingError'].includes(error))return 'fields.remaining';
 if(editor.type==='plan'&&error==='dateError')return 'fields.planDate';
 if(editor.rows&&suffix){const index=editor.rows.findIndex(row=>{try{(editor.type==='receipt'?foodFields:cartFields)(row);return false;}catch(e){return e.message===error;}});if(index>=0)return 'rows.'+index+'.'+suffix;}
 return suffix?'fields.'+suffix:null;
}
function render(){
 if(!store.state)return;cleanupFeed();setLanguage(store.state.settings.language);document.documentElement.lang=getLanguage()==='zh'?'zh-CN':'en';document.title='FoodWise · '+t(current.page==='home'?'home':current.page.startsWith('food')||current.page==='receipt'||current.page==='receipt-camera'?'food':'ghost');
 document.body.classList.toggle('reduce-motion',!!store.state.settings.reduceMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches);document.body.classList.toggle('no-story-animations',store.state.settings.storyAnimations===false);document.body.classList.toggle('hide-story-guidance',store.state.settings.storyGuidance===false);
 const focus=document.activeElement?.dataset?.bind,selection=document.activeElement?.selectionStart,scroll=window.scrollY;
 let body;try{body=['welcome','create-account','login','verify-email','forgot-password','guest-info','terms','privacy'].includes(current.page)?authScreen(current.page):current.page==='home'?home():['settings','food-settings','ghost-settings','food-help','about'].includes(current.page)?settings():current.page.startsWith('food')||current.page==='receipt'||current.page==='receipt-camera'?foodScreen(context()):['story','custom'].includes(current.page)?storyScreen(context()):ghostScreen(context());}catch(error){console.error(error);body=notice('stateError')+nav('home','home');}
 const companion='';
 const onAuth=['welcome','create-account','login','verify-email','forgot-password','guest-info','terms','privacy'].includes(current.page);
 const group=current.page.startsWith('food')||current.page==='receipt'||current.page==='receipt-camera'?'food':current.page==='home'?'home':'cart';
 const err=store.error||message;const feedback=err?`<div id="error" class="notice ${err==='reductionSaved'?'green':'error'}" role="${err==='reductionSaved'?'status':'alert'}" tabindex="-1">${err==='authNotConnected'?(getLanguage()==='zh'?'此預覽版尚未開放註冊與登入，你可以先以訪客身份使用。':'Account sign-up and log-in are not available in this preview. You can continue as a guest.'):err==='productRecognitionUnavailable'?(getLanguage()==='zh'?'無法辨識這張商品照片。請重拍，或改為手動新增。':'Could not recognise this product photo. Try another photo or enter it manually.')+' '+`<button class=\"button outline\" data-action=\"photo-manual\">${getLanguage()==='zh'?'手動新增':'Enter Manually'}</button>`:t(err)}${store.pending?btn('retry','retry','','outline'):''}${['conflict','epochError'].includes(err)?btn('reloadSaved','reload','','outline'):''}</div>`:'';
 $('#app').innerHTML=`<div class="app-shell ${onAuth?'auth-shell':''}">${onAuth?`<div class="auth-language"><button class="lang-button" data-action="language">${getLanguage()==='en'?'中文':'EN'}</button></div>`:''}${onAuth?'':`<header class="app-head">${current.page==='home'?`<div class="wordmark"><img src="assets/ghosty/happy.png" alt="" class="logo-ghost"><span>Food<span class="wise-accent">Wise</span><i class="logo-sprout">❧</i></span></div>`:`<button class="icon-button" data-action="back" aria-label="${t('back')}">${icon('back')}</button><span class="wordmark small"><img src="assets/ghosty/happy.png" alt="" class="logo-ghost"><span>Food<span class="wise-accent">Wise</span></span></span>`}${companion}<div class="row"><button id="language-button" class="lang-button" data-action="language">${getLanguage()==='en'?'中文':'EN'}</button>${current.page==='home'?'':`<button class="icon-button" data-go="${group==='food'?'food-settings':'ghost-settings'}" aria-label="${t('settings')}">${icon('settings')}</button>`}</div></header>`}<main id="main" tabindex="-1">${feedback}${external?notice('conflict')+btn('reloadSaved','reload','','outline'):''}${body||notice('missing')}</main><div class="save-indicator" role="status">${store.status==='saving'?t('saving'):store.pending?t('save_failed'):dirty()&&editor?.type!=='cart'?t('idle'):''}</div>${onAuth?'':`<nav class="bottom-nav" aria-label="${t('home')}">${[['home','home'],['food','food'],['ghost-home','bag']].map(([page,ico])=>`<button class="${group===(page==='ghost-home'?'cart':page)?'active':''}" data-go="${page}"${group===(page==='ghost-home'?'cart':page)?' aria-current="page"':''}>${icon(ico)}<span>${t(page==='ghost-home'?'ghost':page)}</span></button>`).join('')}</nav>`}${modalBody()}</div>`;
 if(['settings','food-settings','ghost-settings'].includes(current.page)){const bs=[...document.querySelectorAll('[data-action="language"][data-value]')];bs.forEach(b=>b.textContent=b.dataset.value==='en'?'English':'中文');}
 if(store.status==='saving'||generating)document.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=true);
 if(store.pending&&store.status!=='saving')document.querySelectorAll('button').forEach(el=>{if(!['retry','reload'].includes(el.dataset.action))el.disabled=true;});
 cleanupFeed=store.pending?()=>{}:bindFeed($('#food-drag'),$('#feed-target'),()=>performAction(),key=>{message=key;render();});
 document.querySelectorAll('img').forEach(img=>{img.addEventListener('error',()=>{const span=document.createElement('span');span.className='asset-fallback';span.textContent=t('assetError');img.replaceWith(span);},{once:true});});
 if(modal){const d=$('#modal');d.showModal();if(modal.type==='add-food')d.focus({preventScroll:true});d.addEventListener('cancel',ev=>{ev.preventDefault();if(!store.pending&&store.status!=='saving')closeModal();});}
 if(focus&&!modal){const el=[...document.querySelectorAll('[data-bind]')].find(x=>x.dataset.bind===focus);el?.focus({preventScroll:true});try{el?.setSelectionRange(selection,selection);}catch{}}
 window.scrollTo(0,scroll);if(['receipt-camera','product-camera'].includes(current.page))startCamera();
 if(store.error&&!modal){const binding=invalidBinding(store.error);const el=[...document.querySelectorAll('[data-bind]')].find(x=>x.dataset.bind===binding);if(el){el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby','error');el.focus();el.scrollIntoView({block:'center'});}else $('#error')?.focus();}
}
function setBound(path,value){if(!editor)return;const keys=path.split('.');let obj=editor;for(const k of keys.slice(0,-1))obj=obj[k];obj[keys.at(-1)]=value;}
function saveDraft(done=()=>{}){
 if(!editor)return;
 const e=editor;
 const success=()=>{if(editor===e){markBaseline();e.blob=null;e.productBlob=null;}done();};
 if(e.type==='cart'){
  const photoMedia=e.productBlob&&e.productImageId?[{id:e.productImageId,blob:e.productBlob}]:[];
  return store.commit('cart_save',{rows:e.rows},photoMedia,success);
 }
 if(e.type==='receipt')return store.commit('receipt_save',{id:e.id,rows:e.rows,imageId:e.imageId,sample:e.sample,qrPayload:e.qrPayload,receiptId:e.receiptId,storeName:e.storeName,receiptTotal:e.receiptTotal},e.blob?[{id:e.imageId,blob:e.blob}]:[],success);
 if(e.type==='custom')return store.commit('custom_save',{draftId:e.draftId,itemId:current.id,fields:e.fields},[],success);
}
async function performAction(){message='';if(store.pending||playing||store.status==='saving')return;const st=getStory(store.state,current.id);if(st?.currentStep!=='action_ready')return;const actionId=st.activeActionId;const itemId=current.id;const action=store.state.storyActions.find(x=>x.id===actionId);const epoch=store.state.epoch;
 await store.commit('action_apply',{itemId,actionId,...(['feed','share'].includes(action.kind)?{selectedQuantity:editor.fields.selectedQuantity}:{})},[],()=>{if(current.page!=='story'||current.id!==itemId||store.state.epoch!==epoch)return;playing=actionId;phase='receive';animator.play(epoch+':'+actionId,action.kind,p=>{if(current.id===itemId&&playing===actionId){phase=p;const stage=$('.story-stage');if(stage)stage.dataset.phase=p;const live=$('.motion-live');if(live)live.textContent=t(action.kind==='feed'?(p==='enjoy'&&store.state.purchaseItems.find(x=>x.id===itemId)?.asset==='milk'?'sipping':p):resultKey(action.kind));if(p==='finish')render();}},()=>{if(current.id===itemId&&playing===actionId){playing=null;phase='result';render();}});});
}
function stopCamera(){
 cameraRequest++; // Invalidate getUserMedia promises that are still awaiting a mobile permission dialog.
 if(cameraStream){for(const track of cameraStream.getTracks())track.stop();cameraStream=null;}
}
async function startCamera(){
 const el=document.getElementById('camera-video');if(!el||cameraStream)return;
 if(cameraUnavailable){
  document.querySelector('.camera-placeholder')?.classList.add('camera-fallback');
  document.querySelector('.camera-bar')?.classList.add('native-capture');
  return;
 }
 const request=++cameraRequest;
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('camera');
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
  const target=document.getElementById('camera-video');
  if(request!==cameraRequest||!target||!['receipt-camera','product-camera'].includes(current.page)){
   stream.getTracks().forEach(track=>track.stop());return;
  }
  cameraStream=stream;target.srcObject=stream;
  await target.play().catch(()=>{});
  target.closest('.camera-stage')?.classList.add('has-video');cameraUnavailable=false;
 }catch{
  if(request!==cameraRequest)return;
  cameraUnavailable=true;
  document.querySelector('.camera-placeholder')?.classList.add('camera-fallback');
  // Native capture uses the user's real tap on the shutter when a live camera is unavailable.
  document.querySelector('.camera-bar')?.classList.add('native-capture');
 }
}
async function captureFrame(kind){
 const video=document.getElementById('camera-video');
 if(!cameraStream||!video?.videoWidth){
  document.getElementById(kind==='receipt'?'receipt-camera':'product-camera')?.click();return;
 }
 const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
 canvas.getContext('2d').drawImage(video,0,0);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.92));
 if(!blob){message='scanUnreadable';render();return;}
 const file=new File([blob],kind+'-'+Date.now()+'.jpg',{type:'image/jpeg'});
 if(kind==='receipt')await chooseImage(file);else await chooseProductImage(file);
}
function photoStillCurrent(ref,token){return editor===ref&&token===previewToken;}
function photoMessage(error){return ['scanNotFound','scanWrongCode','scanUnsupported'].includes(error?.code||error?.message)?'no_match':'scan_error';}
async function chooseImage(file){
 if(!file)return;
 const ref=editor,token=++previewToken;
 let url;
 try{
  // Preview FIRST. A receipt without a known QR must never make a successful photo disappear.
  url=await receiptServices.decode(file);
  if(!photoStillCurrent(ref,token)){URL.revokeObjectURL(url);return;}
  if(ref.imageUrl)URL.revokeObjectURL(ref.imageUrl);
  Object.assign(ref,{imageUrl:url,imageId:uid(),blob:file,photoStatus:'scanning',photoIssue:'',rows:[],
   sample:false,qrPayload:null,receiptId:null,storeName:null,receiptTotal:null});
  stopCamera();current={page:'receipt',id:ref.id};history.pushState(null,'',path('receipt',ref.id));
  message='';render();window.scrollTo(0,0);
 }catch(error){
  if(!photoStillCurrent(ref,token))return;
  message=error.message||'previewError';render();return;
 }
 try{
  const codes=await decodeQRPhoto(file);
  if(!photoStillCurrent(ref,token))return;
  const match=codes.map(code=>catalog.receipt(code)).find(Boolean);
  if(!match){ref.photoIssue='no_match';ref.photoStatus='ready';}
  else if(store.state.receiptImports.some(x=>x.status==='confirmed'&&x.qrPayload===match.qr_payload)){
   ref.photoIssue='duplicate';ref.photoStatus='ready';ref.qrPayload=null;
  }else{
   Object.assign(ref,{qrPayload:match.qr_payload,receiptId:match.receipt_id,storeName:match.store,
    receiptTotal:match.total,rows:catalog.receiptRows(match,uid),photoStatus:'ready',photoIssue:''});
  }
 }catch(error){
  if(!photoStillCurrent(ref,token))return;
  ref.photoStatus='ready';ref.photoIssue=photoMessage(error);
 }finally{
  if(photoStillCurrent(ref,token)){
   render();
   // Save this receipt photo locally without adding anything to My Food.
   // The user must still confirm every item before importing.
   if(ref.blob&&!store.pending)await saveDraft();
  }
 }
}
async function chooseProductImage(file){
 if(!file)return;
 const ref=editor,token=++previewToken;
 let url;
 try{
  url=await receiptServices.decode(file);
  if(!photoStillCurrent(ref,token)){URL.revokeObjectURL(url);return;}
  const row=ref.rows.find(x=>x.cartItemId===current.id);if(!row){URL.revokeObjectURL(url);return;}
  if(ref.productPhotoUrl)URL.revokeObjectURL(ref.productPhotoUrl);
  ref.productPhotoUrl=url;ref.productBlob=file;ref.productImageId=uid();row.photoId=ref.productImageId;
  ref.photoStatus='scanning';ref.photoIssue='';ref.scannedProduct=null;
  stopCamera();current={page:'product-review',id:row.cartItemId};history.pushState(null,'',path(current.page,current.id));
  message='';render();window.scrollTo(0,0);
 }catch(error){
  if(!photoStillCurrent(ref,token))return;
  message=error.message||'previewError';render();return;
 }
 try{
  const codes=await decodeQRPhoto(file);
  if(!photoStillCurrent(ref,token))return;
  const match=codes.map(code=>catalog.product(code)).find(Boolean);
  const row=ref.rows.find(x=>x.cartItemId===current.id);if(!row)return;
  if(match){const photoId=row.photoId;Object.assign(row,catalog.cartRow(match,()=>row.cartItemId),{photoId});ref.scannedProduct=match;ref.photoIssue='';}
  else ref.photoIssue='no_match';
 }catch(error){if(photoStillCurrent(ref,token))ref.photoIssue=photoMessage(error);}
 finally{if(photoStillCurrent(ref,token)){ref.photoStatus='ready';render();}}
}
function applyCatalogProduct(id){
 const product=catalog.getProduct(id);if(!product)return;
 navigateNow('ghost-add',uid());
 const row=editor.rows.find(x=>x.cartItemId===current.id);
 if(row){Object.assign(row,catalog.cartRow(product,()=>row.cartItemId));editor.scannedProduct=product;render();}
}

function goBack(){const id=current.id;if(current.page==='custom')navigate('story',id);else if(current.page==='story'){const st=getStory(store.state,id);if(st?.status==='in_progress'&&!['source','custom_edit'].includes(st.currentStep)){action('story-back');return;}navigate('ghost-home');}else if(['detail','outcome'].includes(current.page))navigate(current.page==='outcome'?'detail':'history',current.page==='outcome'?id:'');else if(current.page==='purchase'||current.page==='money'||current.page==='savings-result')navigate('ghost-home');else if(current.page==='choose-item')navigate('ghost-home');else if(current.page==='ghost-settings')navigate('ghost-home');else if(current.page==='food-settings'||current.page==='food-help')navigate('food');else if(current.page==='about')navigate('food-settings');else if(['ghost-add','product-review','product-camera','checkout'].includes(current.page))navigate('cart');else if(current.page==='cart'||current.page==='history')navigate('ghost-home');else if(['food-edit','food-use','food-plan'].includes(current.page))navigate('food-detail',id);else if(current.page==='food-detail'||current.page==='food-new'||current.page==='receipt'||current.page==='receipt-camera')navigate('food');else navigate('home');}
async function action(name,value){
 if(name==='retry'){await store.retry();return;}
 if(name==='reload'){await store.reload();external=false;render();return;}
 if(store.pending||store.status==='saving')return;
 if(name==='back'){goBack();return;}
 if(name==='story-back'){const st=getStory(store.state,current.id);if(!st||st.status==='completed')return;activityPlayedKey='';store.commit('story_back',{itemId:current.id});return;}
 if(name==='enter-guest'){guestEnteredThisLaunch=true;navigateNow('home');return;}
 if(name==='exit-guest'){guestEnteredThisLaunch=false;navigateNow('welcome');return;}
 if(name==='settings-toggle'){const enabled=!store.state.settings[value];if(value==='phoneNotifications'&&enabled){if(!('Notification'in window)){message='notificationPermission';render();return;}try{const permitted=await Notification.requestPermission();if(permitted!=='granted'){message='notificationPermission';render();return;}}catch{message='notificationPermission';render();return;}}store.commit('settings_update',{values:{[value]:enabled}});return;}
 if(name==='reminder-days'){store.commit('settings_update',{values:{nearDateDays:Number(value)}});return;}
 if(name==='language'){haltMotion();store.commit('language',{language:value||(getLanguage()==='en'?'zh':'en')});return;}
 if(name==='modal-close'){closeModal();return;}
 if(name==='add-food'){openModal({type:'add-food'});return;}
 if(name==='food-star'){store.commit('food_star',{id:value});return;}
 if(name==='food-delete'){openModal({type:'food-delete'});return;}
 if(name==='confirm-food-delete'){store.commit('food_delete',{id:current.id},[],()=>{modal=null;filters.status='available';navigateNow('food');});return;}
 if(name==='food-status'){filters.status=filters.status==='available'?'past':'available';render();return;}
 if(name==='food-end'){openModal({type:'food-end',status:value});return;}
 if(name==='confirm-food-end'){store.commit('food_end',{id:current.id,status:value},[],()=>{modal=null;filters.status='past';navigateNow('food');});return;}
 if(name==='confirm-zero'){const fields=modal.fields;store.commit(fields?'food_edit':'food_remaining',{id:current.id,remaining:'0',fields,confirmUsed:true},[],()=>navigateNow('food-detail',current.id));return;}
 if(name==='cancel-food-edit'){prepareEditor(current);message='';store.error=null;render();return;}
 if(name==='cancel-plan'){store.commit('food_plan',{id:current.id,planDate:null},[],()=>navigateNow('food-detail',current.id));return;}
 if(name==='new-ghost'){let id=uid();try{const d=JSON.parse(localStorage.getItem('fw-pending-item')||'null');if(d?.cartItemId)id=d.cartItemId;}catch{}navigate('ghost-add',id);return;}
 if(name==='cart-remove'){editor.rows=editor.rows.filter(x=>x.cartItemId!==value);scheduleCartSave();render();return;}
 if(name==='ignore-reference'){editor.ignoreReference=true;render();return;}
 if(name==='open-product-scan'){navigateNow('product-camera',uid());return;}
 if(name==='catalog-select'){applyCatalogProduct(value);return;}
 if(name==='receipt-add'){editor.rows.push({id:uid(),...blankFood()});render();return;}
 if(name==='receipt-remove'){editor.rows.splice(Number(value),1);render();return;}
 if(name==='receipt-confirm'){store.commit('receipt_confirm',{id:editor.id,rows:editor.rows,imageId:editor.imageId,sample:editor.sample,qrPayload:editor.qrPayload,receiptId:editor.receiptId,storeName:editor.storeName,receiptTotal:editor.receiptTotal},editor.blob?[{id:editor.imageId,blob:editor.blob}]:[],()=>navigateNow('food'));return;}
 
 if(name==='capture-receipt'||name==='capture-product'){await captureFrame(name==='capture-receipt'?'receipt':'product');return;}
 if(name==='camera-retry'){stopCamera();cameraUnavailable=false;startCamera();return;}
 if(name==='photo-manual'){navigateNow('ghost-add',current.id);return;}
 if(name==='begin-receipt-story'){const p=store.state.purchases.find(x=>x.id===value);if(!p)return;navigate('story',p.itemIds[0]);if(p.itemIds.length>1)navigateNow('choose-item',p.id);return;}
 if(name==='finish-next'){const it=store.state.purchaseItems.find(x=>x.id===current.id);if(!it)return;const p=store.state.purchases.find(x=>x.id===it.purchaseId);navigate('choose-item',p.id);return;}
 if(name==='checkout'){store.commit('checkout',{},[],result=>navigateNow('purchase',result.purchaseId));return;}
 if(name==='start-story'){activityPlayedKey='';store.commit('story_start',{itemId:current.id,source:'preset',template:value},[],()=>{editor={type:'amount',fields:{amount:half(store.state.purchaseItems.find(x=>x.id===current.id).quantity),reductionQuantity:getOutcome(store.state,current.id)?.reductionQuantity||''}};});return;}
 if(name==='play-ghost'){
  const st=getStory(store.state,current.id);
  if(st?.currentStep==='ghost_activity'){
   activityPlayedKey=current.id+':'+st.storyRevision;render();
   const resultButton=document.querySelector('[data-animated-result]');
   if(resultButton){
    const reduce=store.state.settings.reduceMotion||store.state.settings.storyAnimations===false||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce)resultButton.disabled=false;
    else setTimeout(()=>{if(resultButton.isConnected)resultButton.disabled=false;},1350);
   }
  }
  return;
 }
 if(name==='answer'){const story=getStory(store.state,current.id);if(value==='activity_done'&&Number(story?.remainingQuantity)>0&&Number(story?.sharedQuantity||0)===0&&Number(story?.usedQuantity||0)<Number(store.state.purchaseItems.find(x=>x.id===current.id)?.quantity)&&activityPlayedKey!==current.id+':'+story?.storyRevision)return;if(value==='activity_done'&&Number(story?.sharedQuantity||0)>0&&activityPlayedKey!==current.id+':'+story?.storyRevision)return;store.commit('story_answer',{itemId:current.id,value});return;}
 if(name==='set-amount'){editor.fields.amount=value;render();return;}
 if(name==='execute-action'){performAction();return;}
 if(name==='continue-story'||name==='back-recap'){store.commit('story_continue',{itemId:current.id,back:name==='back-recap'});return;}
 if(name==='intention'){const intent=value==='dont_buy'?'leave_for_now':value==='as_planned'?'still_want':value;store.commit('outcome_update',{itemId:current.id,intention:intent||null},[],()=>{if(intent!=='buy_less')store.commit('story_finish',{itemId:current.id},[],()=>navigateNow(intent==='leave_for_now'?'savings-result':'story',current.id));else {editor.fields.finalQuantity='';render();}});return;}
 if(name==='finish-item'){const o=getOutcome(store.state,current.id);if(o.intention==='buy_less'){const it=store.state.purchaseItems.find(x=>x.id===current.id);try{reductionQty(editor.fields.reductionQuantity,it.quantity);}catch{store.error='reductionError';render();return;}await store.commit('outcome_update',{itemId:current.id,reductionQuantity:editor.fields.reductionQuantity});if(store.pending||store.error)return;}store.commit('story_finish',{itemId:current.id},[],()=>{const outcome=getOutcome(store.state,current.id);navigateNow(['buy_less','leave_for_now'].includes(outcome.intention)?'savings-result':'story',current.id);});return;}
 if(name==='switch-item'){haltMotion();openModal({type:'switch'});return;}
 if(name==='revise'||name==='revise-source'){haltMotion();openModal({type:'revise',source:name==='revise-source'});return;}
 if(name==='confirm-revise'){activityPlayedKey='';store.commit('story_revise',{itemId:current.id,source:value==='source'},[],()=>{modal=null;prepareEditor(current);});return;}
 if(name==='reset'){openModal({type:'reset'});return;}
 if(name==='confirm-reset'){haltMotion();store.commit('reset',{},[],()=>{external=false;navigateNow('home');});return;}
}
async function submit(kind){
 try{
 if(['create-account','login','forgot-password'].includes(kind)){message='authNotConnected';render();return;}
 if(kind==='food'){foodFields(editor.fields);if(current.page!=='food-new'&&qty(editor.fields.remaining)==='0'){openModal({type:'zero',fields:clone(editor.fields)});return;}store.commit(current.page==='food-new'?'food_add':'food_edit',{id:current.id,fields:editor.fields},[],result=>navigateNow('food-detail',result.id||current.id));}
 if(kind==='food-use'){const n=qty(editor.fields.remaining);if(n==='0')openModal({type:'zero'});else store.commit('food_remaining',{id:current.id,remaining:n},[],()=>navigateNow('food-detail',current.id));}
 if(kind==='food-plan')store.commit('food_plan',{id:current.id,planDate:editor.fields.planDate},[],()=>navigateNow('food-detail',current.id));
 if(kind==='ghost-add'){cartFields(editor.rows.find(x=>x.cartItemId===current.id));saveDraft(()=>{try{localStorage.removeItem('fw-pending-item');}catch{}navigateNow('cart');});}
 if(kind==='custom'){store.commit('story_start',{itemId:current.id,source:'custom',template:editor.fields.template,text:editor.fields.text},[],()=>navigateNow('story',current.id));}
 if(kind==='story-use'){
  const st=getStory(store.state,current.id),it=store.state.purchaseItems.find(x=>x.id===current.id);
  const used=qty(editor.fields.useQuantity);
  if(cmp(used,it.quantity)>0)throw Error('quantityError');
  store.commit('story_answer',{itemId:current.id,value:(st.currentStep==='quantity_question'?'qty:':'amount:')+used});
 }
 if(kind==='amount')store.commit('story_answer',{itemId:current.id,value:editor.fields.amount});
 if(kind==='reduction'){const it=store.state.purchaseItems.find(x=>x.id===current.id),final=qty(editor.fields.finalQuantity,true),reduction=sub(it.quantity,final);reductionQty(reduction,it.quantity);store.commit('outcome_update',{itemId:current.id,reductionQuantity:reduction},[],()=>store.commit('story_finish',{itemId:current.id},[],()=>navigateNow('savings-result',it.id)));}
 if(kind==='outcome'){
  const it=store.state.purchaseItems.find(x=>x.id===current.id);
  const intention=editor.fields.intention;
  const payload={itemId:current.id,intention:intention||null};
  // Only legacy virtual receipts could lack a price; require explicit repair.
  if(getOutcome(store.state,current.id)?.estimateCents===null){
   const repaired=cents(editor.fields.price);
   if(repaired===null)throw Error('moneyError');
   payload.price=editor.fields.price;
  }
  if(intention==='buy_less'){
   const final=qty(editor.fields.finalQuantity,true);
   if(cmp(final,it.quantity)>=0)throw Error('reductionError');
   payload.reductionQuantity=reductionQty(sub(it.quantity,final),it.quantity);
  }
  store.commit('outcome_update',payload,[],()=>navigateNow('detail',current.id));
 }
 }catch(error){store.error=error.message;render();$('#error')?.focus();}
}
store.changed=()=>{
 const st=store.state&&getStory(store.state,current.id);
 if(current.page==='story'&&st?.currentStep==='action_ready'&&editor?.type==='amount'&&editor.actionId!==st.activeActionId){const a=store.state.storyActions.find(x=>x.id===st.activeActionId);editor.actionId=a.id;editor.fields.selectedQuantity=a.selectedQuantity;}
 render();
};
store.onExternal=()=>{external=true;render();};
document.addEventListener('input',event=>{const el=event.target;if(el.dataset.bind){setBound(el.dataset.bind,el.value);if(current.page==='cart')scheduleCartSave();if(current.page==='ghost-add'&&!store.state.cart.some(x=>x.cartItemId===current.id)){try{localStorage.setItem('fw-pending-item',JSON.stringify(editor.rows.find(x=>x.cartItemId===current.id)));}catch{}}store.error=null;message='';if(current.page==='ghost-add'&&el.dataset.bind.endsWith('.name')){if($('#same-name'))$('#same-name').innerHTML=sameNameCard(store.state,el.value);editor.ignoreReference=false;}if(['story','outcome'].includes(current.page)){
 const it=store.state.purchaseItems.find(x=>x.id===current.id),o=getOutcome(store.state,current.id),st=getStory(store.state,current.id);
 if($('#action-remaining-preview'))$('#action-remaining-preview').innerHTML=actionPreview(st.remainingQuantity,editor.fields.selectedQuantity);
 if($('#planned-reduction-preview'))$('#planned-reduction-preview').innerHTML=current.page==='story'?reductionSummary(it,o.estimateCents,editor.fields.reductionQuantity):reductionPreview(it,editor.fields,false,o.estimateCents);
 if($('#actual-reduction-preview'))$('#actual-reduction-preview').innerHTML=reductionPreview(it,editor.fields,true);
 }const indicator=$('.save-indicator');if(indicator)indicator.textContent=dirty()?t('idle'):'';}if(el.dataset.bind&&current.page==='story'&&$('#buy-less-preview')){
 const item=store.state.purchaseItems.find(x=>x.id===current.id);
 const decision=getOutcome(store.state,current.id);
 if(item&&decision)$('#buy-less-preview').innerHTML=buyLessPreview(item,decision.estimateCents,editor.fields.finalQuantity);
 }
 if(el.dataset.bind&&current.page==='story'&&$('#usage-preview')){
 const it=store.state.purchaseItems.find(x=>x.id===current.id);
 if(it)$('#usage-preview').innerHTML=useAmountPreview(it,editor.fields.useQuantity);
 }
 if(el.dataset.bind&&['ghost-add','product-review'].includes(current.page)&&editor?.type==='cart'){
  const row=editor.rows.find(x=>x.cartItemId===current.id);
  const target=document.querySelector('[data-cart-price-preview]');
  if(row&&target)target.innerHTML=cartPricePreview(row);
 }
 if(el.dataset.filter){filters[el.dataset.filter]=el.value;const active=el.selectionStart;render();const input=$('[data-filter="search"]');input?.focus({preventScroll:true});try{input?.setSelectionRange(active,active);}catch{}}});
document.addEventListener('change',event=>{if(['receipt-image','receipt-camera'].includes(event.target.id))chooseImage(event.target.files[0]);if(['product-image','product-camera'].includes(event.target.id))chooseProductImage(event.target.files[0]);if(event.target.dataset.bind){setBound(event.target.dataset.bind,event.target.value);if(event.target.tagName==='SELECT')render();}});
let handoverDrag=null;
document.addEventListener('pointerdown',event=>{
 const food=event.target.closest('[data-handover-food]');if(!food||food.disabled||store.pending)return;
 if(event.button!==0&&event.pointerType==='mouse')return;
 const receiver=document.querySelector('[data-handover-target]');if(!receiver)return;
 handoverDrag={food,receiver,id:event.pointerId,startX:event.clientX,startY:event.clientY};
 try{food.setPointerCapture(event.pointerId);}catch{}
 food.classList.add('is-dragging');event.preventDefault();
});
document.addEventListener('pointermove',event=>{
 if(!handoverDrag||handoverDrag.id!==event.pointerId)return;
 const {food,startX,startY,receiver}=handoverDrag;
 food.style.transform=`translate(${event.clientX-startX}px, ${event.clientY-startY}px) scale(1.06)`;
 const r=receiver.getBoundingClientRect();receiver.classList.toggle('is-targeted',event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom);
});
document.addEventListener('pointerup',event=>{
 if(!handoverDrag||handoverDrag.id!==event.pointerId)return;
 const {food,receiver}=handoverDrag;handoverDrag=null;
 const r=receiver.getBoundingClientRect();const hit=event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;
 food.style.transform='';food.classList.remove('is-dragging');receiver.classList.remove('is-targeted');
 if(hit)action('play-ghost');
});
document.addEventListener('pointercancel',()=>{if(!handoverDrag)return;handoverDrag.food.style.transform='';handoverDrag.food.classList.remove('is-dragging');handoverDrag.receiver.classList.remove('is-targeted');handoverDrag=null;});
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b||b.disabled)return;if(b.dataset.go){navigate(b.dataset.go,b.dataset.id||'');return;}if('category'in b.dataset){filters.category=b.dataset.category;render();return;}if(b.dataset.action)action(b.dataset.action,b.dataset.value||'');});
document.addEventListener('submit',event=>{if(event.target.dataset.form){event.preventDefault();if(event.target.dataset.form==='create-account'&&!event.target.reportValidity())return;submit(event.target.dataset.form);}});
let restoringStoryRoute=false;
window.addEventListener('popstate',()=>{
 const st=current.page==='story'?getStory(store.state,current.id):null;
 if(st?.status==='in_progress'&&!['source','custom_edit'].includes(st.currentStep)&&route().page!=='story'){
  restoringStoryRoute=true;history.pushState({foodwiseStory:true},'',path('story',current.id));action('story-back');
  setTimeout(()=>{restoringStoryRoute=false;},0);
 }
});
window.addEventListener('hashchange',()=>{if(restoringStoryRoute)return;const next=route();const allowed=entryPage(next.page,guestEnteredThisLaunch);if(allowed!==next.page){navigateNow('welcome','',true);return;}if(keyOf(next)===keyOf(current))return;if(next.page==='story'&&current.page==='story'&&next.id===current.id){action('story-back');return;}stopCamera();current=next;prepareEditor(current);render();});
window.addEventListener('beforeunload',event=>{if(store.pending||store.status==='saving'){event.preventDefault();event.returnValue='';}});
window.addEventListener('focus',async()=>{if(store.state&&store.status!=='saving'){checkPhoneReminders();try{const next=await store.repository.load();if(next.revision!==store.state.revision||next.epoch!==store.state.epoch){external=true;render();}}catch{}}});
function checkPhoneReminders(){
 if(!store.state?.settings.phoneNotifications||!('Notification'in window)||Notification.permission!=='granted')return;
 const limit=Number(store.state.settings.nearDateDays||5),day=today();
 for(const f of store.state.foodItems){if(f.status!=='available'||!f.recordedDate)continue;const until=daysUntil(f.recordedDate);if(until===null||until>limit)continue;
 const key='fw-reminder-'+day+'-'+f.id;if(localStorage.getItem(key)==='yes')continue;
 try{new Notification('FoodWise · '+f.name,{body:until<0?'Expiry date has passed.':until===0?'Expiry date is today.':'Expiry date in '+until+' day(s).'});localStorage.setItem(key,'yes');}catch{}
 }}
async function boot(){try{await catalog.load();await store.open();setLanguage(store.state.settings.language);// Every browser open or reload shows Welcome, even for a previous Guest.
// Replacing a stale #home/#story deep link is intentional; stored user data stays intact.
 guestEnteredThisLaunch=false;
 localStorage.removeItem(ONBOARDING_KEY); // remove only obsolete entry flag
 current={page:initialPage(),id:''};
 history.replaceState(null,'',path(initialPage()));
 prepareEditor(current);render();checkPhoneReminders();}catch(error){$('#app').innerHTML=`<main class="loading"><h1>FoodWise</h1><p role="alert">${t(error.message)||t('scanCatalogError')}</p><button id="retry-open" class="button">${t('retryOpen')}</button></main>`;$('#retry-open').onclick=boot;}}
boot();
// Preload the motion sheet and poses; a failed asset cannot alter business progress.
['sprite-enjoy-frames-v2','sprite-sip','sprite-store','sprite-share-neutral'].forEach(asset=>{const image=new Image();image.onerror=()=>{if(asset==='sprite-enjoy-frames-v2'){motionSheetAvailable=false;if(store.state)render();}};image.src='assets/'+asset+'.png';});
