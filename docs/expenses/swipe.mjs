let closeOpen;
export function swipeExpense(row,button,onOpen,onDelete){
 const front=row.querySelector('.expense-row'),width=88;let offset=0,start=null,suppressUntil=0;
 const paint=(x,animate=true)=>{offset=Math.max(-width,Math.min(0,x));front.style.transition=animate?'transform .18s ease':'';front.style.transform=`translateX(${offset}px)`;};
 const close=()=>{paint(0);row.classList.remove('revealed');};
 const reveal=()=>{if(closeOpen!==close)closeOpen?.();closeOpen=close;paint(-width);row.classList.add('revealed');};
 front.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;start={id:e.pointerId,x:e.clientX,y:e.clientY,offset,axis:null};});
 front.addEventListener('pointermove',e=>{if(!start||start.id!==e.pointerId)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(!start.axis){if(Math.max(Math.abs(dx),Math.abs(dy))<9)return;start.axis=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';if(start.axis==='x'){if(closeOpen!==close)closeOpen?.();front.setPointerCapture(e.pointerId);}}if(start.axis!=='x')return;e.preventDefault();paint(start.offset+dx,false);});
 const finish=e=>{if(!start||start.id!==e.pointerId)return;const wasDrag=start.axis==='x';start=null;if(wasDrag){suppressUntil=Date.now()+350;if(offset<-width*.38)reveal();else close();}if(front.hasPointerCapture(e.pointerId))front.releasePointerCapture(e.pointerId);};
 front.addEventListener('pointerup',finish);front.addEventListener('pointercancel',e=>{if(start?.id===e.pointerId){start=null;close();suppressUntil=Date.now()+350;}});
 front.onclick=e=>{if(Date.now()<suppressUntil){e.preventDefault();return;}if(offset){close();return;}closeOpen?.();onOpen();};
 front.onkeydown=e=>{if(['ArrowLeft','Delete'].includes(e.key)){e.preventDefault();reveal();button.focus();}if(['ArrowRight','Escape'].includes(e.key)){e.preventDefault();close();}};
 front.oncontextmenu=e=>{e.preventDefault();reveal();};
 button.onfocus=reveal;button.onclick=onDelete;
 button.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();front.focus();}};
}
