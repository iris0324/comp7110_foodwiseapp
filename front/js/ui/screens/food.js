import {t,dateText,timeText,getLanguage} from '../../i18n/index.js?v=13.0';
import {esc} from '../dom.js?v=13.0';
import {btn,nav,title,field,foodForm,foodCard,sprite,line,dateBadge,dateClass,categories} from '../components.js?v=13.0';
import {foodList} from '../../domain/selectors.js?v=13.0';
import {scannedReceiptMeta} from '../scanner-panels.js?v=13.0';
const L=(en,zh)=>getLanguage()==='zh'?zh:en;
export function foodScreen({s,r,e,filters}){const f=s.foodItems.find(x=>x.id===r.id);
 if(r.page==='food'){
  const list=foodList(s,filters);
  return title('foodTitle',t('food'))+`<p class="subtitle">${t('foodSubtitle')}</p>`+btn('addFood','add-food')+`<label class="search"><span>${t('search')}</span><input data-filter="search" value="${esc(filters.search)}" type="search"></label><div class="chips"><button class="chip ${!filters.category?'active':''}" data-category="">${t('all')}</button>${['produce','dairy','protein'].map(k=>`<button class="chip category-${k} ${filters.category===k?'active':''}" data-category="${k}">${t(k)}</button>`).join('')}</div>`+btn(filters.status==='past'?'availableList':'pastRecords','food-status','','text')+
  `<div id="food-list">${list.length?list.map(x=>foodCard(x,s.settings.nearDateDays)).join(''):`<div class="empty gentle-empty">${sprite('think')}<h3>${filters.status==='past'?L('No past records yet','還沒有過去紀錄'):s.foodItems.some(f=>f.status==='available')?L('No matching food','沒有符合條件的食物'):L('No food added yet','還沒有新增食物')}</h3><p>${filters.status==='past'?L('Used up and discarded food will appear here.','已用完或丟棄的食物會顯示在這裡。'):L('Add your first item to start tracking your food.','新增第一件食物，就可以開始管理清單。')}</p></div>`}</div>`;
 }
 if(r.page==='food-new')return title('addFood',t('food'))+`<form data-form="food" novalidate>${foodForm(e.fields)}<button class="button">${t('saveFood')}</button></form>`+nav('cancel','food');
 if(r.page==='receipt'){
  const rows=e.rows||[];
  return `<div class="eyebrow">${t('food')}</div><h1>${rows.length?L('Review & Edit','確認與編輯'):L('Receipt Photo','拍攝收據')}</h1>`+
  (!rows.length?`<div class="empty receipt-wait"><img src="assets/ghosty/curious.png" alt="Ghosty" class="mini-ghost"><p>${L('Take a receipt photo or choose one from your album.','拍攝整張收據，或從相簿選取照片。')}</p><button class="button" data-go="receipt-camera">${L('Take Photo','拍攝收據')}</button></div>`:
   `${scannedReceiptMeta(e)}${e.imageUrl?`<img class="receipt-preview" src="${esc(e.imageUrl)}" alt="${L('Receipt photo','收據照片')}">`:''}<p class="subtitle">${L('Check the items before adding them to My Food.','加入 My Food 前，請先核對商品。')}</p><div class="review-rows">${rows.map((x,i)=>`<article class="review-row"><div class="row between"><span class="badge">${i+1}</span>${btn('deleteRow','receipt-remove',String(i),'text danger')}</div>${foodForm(x,'rows.'+i+'.')}</article>`).join('')}</div>${btn('addRow','receipt-add','','outline')}${btn('confirmImport','receipt-confirm')}`);
 }
 if(r.page==='receipt-camera')return `<div class="eyebrow">${t('food')}</div><h1>${L('Take Photo','拍攝收據')}</h1><p class="subtitle">${L('Photograph the receipt so its QR code is visible.','拍攝整張收據，讓照片裡的 QR Code 清楚可見。')}</p><div class="camera-stage"><video id="camera-video" autoplay playsinline muted></video><div class="camera-placeholder" id="camera-placeholder"><img src="assets/ghosty/curious.png" alt="Ghosty"></div></div><div class="camera-bar"><label class="camera-album">▧<span>${L('Choose from Album','從相簿選擇')}</span><input id="receipt-image" type="file" accept="image/*"></label><button type="button" class="shutter" data-action="capture-receipt" aria-label="${L('Take Photo','拍照')}"><span></span></button><button type="button" class="camera-retry" data-action="camera-retry">↻</button></div><p class="camera-help">${L('Camera not available? Choose a photo from your album.','相機無法使用時，仍可以選擇相簿照片。')}</p><input id="receipt-camera" type="file" accept="image/*" capture="environment" hidden>`;
 if(!f)return nav('back','food');
 if(['food-detail','food-edit'].includes(r.page)){
  const available=f.status==='available',fields=e.fields;
  const form=available?`<form data-form="food" novalidate>${field('fields.name','name',fields.name)}${field('fields.quantity','quantity',fields.quantity)}${field('fields.unit','unit',fields.unit,{optional:true})}${field('fields.category','category',fields.category,{options:categories.map(k=>[k,k])})}${field('fields.recordedDate','recordedDate',fields.recordedDate,{type:'date',optional:true})}<p class="food-added-date">${t('daysSincePurchase')}: ${Math.max(0,Math.floor((Date.now()-new Date(f.createdAt).getTime())/86400000))} ${t('dayUnit')}</p><button class="button">${t('saveChanges')}</button></form>`:
   `<div class="card">${line('quantity',f.remainingQuantity+(f.unit?' '+f.unit:''))}${line('category',t(f.category))}${line('recordedDate',dateText(f.recordedDate))}${line('daysSincePurchase',String(Math.max(0,Math.floor((Date.now()-new Date(f.createdAt).getTime())/86400000)))+' '+t('dayUnit'))}</div>`;
  return `<div class="detail-heading"><div><div class="eyebrow">${t('food')}</div><h1>${esc(f.name)}</h1></div></div><section class="expiry-summary date-card-${dateClass(f)}">${dateBadge(f,s.settings.nearDateDays)}</section>${form}`+(available?`<div class="detail-actions">${btn('usedUp','food-end','used_up','secondary')}${btn('discard','food-end','discarded','outline')}</div>`:'')+`<div class="food-delete-action"><button type="button" class="button outline danger" data-action="food-delete">${L('Delete Food','刪除食品')}</button></div>`;
 }
 return nav('back','food');
}
