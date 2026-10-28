import {Repository} from '../js/storage/repository.js?v=6.3';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await pause(25);}throw Error('Frame did not become ready');};
document.querySelector('#run').onclick=async()=>{
 const button=document.querySelector('#run'),frame=document.querySelector('#frame'),report=document.querySelector('#report');button.disabled=true;
 const repo=new Repository();let s=await repo.open();repo.close();const original=s.settings.language,food=s.foodItems.find(x=>x.status==='available'),item=s.purchaseItems.find(x=>s.stories.some(st=>st.purchaseItemId===x.id&&st.status==='in_progress'))||s.purchaseItems[0],purchase=s.purchases[0];
 const pages=['home','food','food-new','receipt','cart','ghost-add/layout-draft','checkout','history','money','settings',...(food?['food-detail/'+food.id,'food-edit/'+food.id,'food-use/'+food.id,'food-plan/'+food.id]:[]),...(item?['detail/'+item.id,'outcome/'+item.id,'story/'+item.id,'custom/'+item.id]:[]),...(purchase?['purchase/'+purchase.id]:[])];
 const rows=[];let sequence=0;const load=async src=>{await new Promise(resolve=>{frame.onload=resolve;frame.src=src;});await until(()=>frame.contentDocument?.querySelector('#main'));};
 try{for(const width of [320,390,430])for(const language of ['en','zh'])for(const page of pages){
 frame.width=String(width);await load('../?layout='+(++sequence)+'#'+page);const doc=frame.contentDocument;
 if(doc.documentElement.lang!==(language==='zh'?'zh-CN':'en')){doc.querySelector('#language-button').click();await until(()=>doc.documentElement.lang===(language==='zh'?'zh-CN':'en'));}
 await until(()=>!doc.querySelector('.save-indicator')?.textContent.includes('Saving'));
 await Promise.all([...doc.images].map(im=>im.decode().catch(()=>{})));
 const win=frame.contentWindow;const oversized=[...doc.querySelectorAll('#main *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>width+1||r.left< -1)&&!el.closest('.chips');}).map(el=>({tag:el.tagName,cls:el.className}));
 rows.push({width,actualWidth:win.innerWidth,language,page,documentWidth:doc.documentElement.scrollWidth,oversized,brokenImages:[...doc.images].filter(im=>im.complete&&!im.naturalWidth).length,errors:doc.querySelector('#error')?.textContent||'',status:doc.documentElement.scrollWidth<=width&&oversized.length===0?'pass':'fail'});
 report.textContent=JSON.stringify({running:true,completed:rows.length,rows},null,2);
 doc.querySelector('.bottom-nav [data-go=home]')?.click();await pause(20);doc.querySelector('[data-action=draft-discard]')?.click();await pause(20);
 }
 }catch(error){rows.push({status:'fail',error:String(error.stack||error)});}
 await load('../?layout=restore#home');if(frame.contentDocument.documentElement.lang!==(original==='zh'?'zh-CN':'en')){frame.contentDocument.querySelector('#language-button').click();await until(()=>frame.contentDocument.documentElement.lang===(original==='zh'?'zh-CN':'en'));}
 report.textContent=JSON.stringify({date:new Date().toISOString(),note:'Real iframe browsing contexts; browser-level viewport API did not change the existing 1280px viewport.',count:rows.length,passed:rows.filter(x=>x.status==='pass').length,rows},null,2);button.disabled=false;button.textContent='Run again';
};
