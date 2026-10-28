// No business state is changed by pointer movement. Pointer and keyboard share accept().
export function bindFeed(bubble,target,accept,invalid){
 if(!bubble||!target)return ()=>{};let drag=null;
 const down=e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};bubble.setPointerCapture(e.pointerId);bubble.classList.add('dragging');target.classList.add('receiving');};
 const move=e=>{if(drag?.id!==e.pointerId)return;bubble.style.transform=`translate(${e.clientX-drag.x}px,${e.clientY-drag.y}px)`;};
 const reset=()=>{bubble.style.transform='';bubble.classList.remove('dragging');target.classList.remove('receiving');drag=null;};
 const up=e=>{if(drag?.id!==e.pointerId)return;const r=target.getBoundingClientRect();const valid=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8;reset();if(moved&&valid)accept();else if(moved)invalid('invalidDrop');};
 const cancel=()=>{if(drag){reset();invalid('cancelledDrop');}};
 const key=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();accept();}};
 bubble.addEventListener('pointerdown',down);bubble.addEventListener('pointermove',move);bubble.addEventListener('pointerup',up);bubble.addEventListener('pointercancel',cancel);bubble.addEventListener('lostpointercapture',cancel);bubble.addEventListener('keydown',key);
 return ()=>{reset();bubble.removeEventListener('pointerdown',down);bubble.removeEventListener('pointermove',move);bubble.removeEventListener('pointerup',up);bubble.removeEventListener('pointercancel',cancel);bubble.removeEventListener('lostpointercapture',cancel);bubble.removeEventListener('keydown',key);};
}
