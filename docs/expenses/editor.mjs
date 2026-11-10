import {cropRect,filterPixels} from './model.mjs?v=3';
import {cropHandles,cropHit,dragCrop} from './crop-interaction.mjs?v=5';
export function imageEditor({dialog,canvas,onSave,onError}){let base,working,crop,mode='colour',drag=null,record=null,filterCache=null,geometry=null;const $=id=>document.getElementById(id);const ctx=canvas.getContext('2d');
 function defaults(){drag=null;crop={x:0,y:0,w:1,h:1};mode='colour';$('brightness').value=100;$('contrast').value=100;$('threshold').value=155;updateModes();}
 function updateModes(){document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('threshold-wrap').hidden=mode!=='bw';filterCache=null;}
 function filtered(){if(filterCache)return filterCache;const c=document.createElement('canvas');c.width=working.width;c.height=working.height;const x=c.getContext('2d',{willReadFrequently:true});x.filter=`brightness(${$('brightness').value}%) contrast(${$('contrast').value}%)`;x.drawImage(working,0,0);x.filter='none';if(mode!=='colour'){const d=x.getImageData(0,0,c.width,c.height);filterPixels(d.data,mode,Number($('threshold').value));x.putImageData(d,0,0);}return filterCache=c;}

 function draw(){
  if(!working||!dialog.open)return;
  const pad=32,available=Math.max(100,canvas.parentElement.clientWidth-64),maxH=Math.max(150,Math.min(430,innerHeight*.43)-64);
  const scale=Math.min(available/working.width,maxH/working.height),w=Math.round(working.width*scale),h=Math.round(working.height*scale);
  geometry={pad,w,h,width:w+pad*2,height:h+pad*2};
  const dpr=window.devicePixelRatio||1;canvas.width=Math.round(geometry.width*dpr);canvas.height=Math.round(geometry.height*dpr);canvas.style.width=geometry.width+'px';canvas.style.height=geometry.height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#192a25';ctx.fillRect(0,0,geometry.width,geometry.height);ctx.drawImage(filtered(),pad,pad,w,h);
  const x=pad+crop.x*w,y=pad+crop.y*h,cw=crop.w*w,ch=crop.h*h;
  ctx.fillStyle='#061c17a6';ctx.fillRect(pad,pad,w,y-pad);ctx.fillRect(pad,y,x-pad,ch);ctx.fillRect(x+cw,y,pad+w-x-cw,ch);ctx.fillRect(pad,y+ch,w,pad+h-y-ch);
  ctx.strokeStyle='#b4f6cc';ctx.lineWidth=2;ctx.strokeRect(x,y,cw,ch);
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(x+cw*i/3,y);ctx.lineTo(x+cw*i/3,y+ch);ctx.moveTo(x,y+ch*i/3);ctx.lineTo(x+cw,y+ch*i/3);ctx.stroke();}
  for(const [type,hx,hy] of cropHandles(crop)){
   const px=pad+hx*w,py=pad+hy*h,selected=drag?.type===type;
   ctx.beginPath();ctx.arc(px,py,selected?22:18,0,Math.PI*2);ctx.fillStyle=selected?'#b4f6cc88':'#ffffff22';ctx.fill();
   ctx.beginPath();ctx.arc(px,py,type.length===2?10:8,0,Math.PI*2);ctx.fillStyle=selected?'#b4f6cc':'#fff';ctx.fill();ctx.strokeStyle='#17685b';ctx.lineWidth=2;ctx.stroke();
  }
 }
 function point(e){const r=canvas.getBoundingClientRect();return {x:((e.clientX-r.left)*geometry.width/r.width-geometry.pad)/geometry.w,y:((e.clientY-r.top)*geometry.height/r.height-geometry.pad)/geometry.h};}
 canvas.onpointerdown=e=>{
  if(!geometry||!e.isPrimary||e.button!==0)return;
  const p=point(e),type=cropHit(crop,p,geometry.w,geometry.h);if(!type)return;
  e.preventDefault();drag={type,point:p,start:{...crop},id:e.pointerId};canvas.setPointerCapture(e.pointerId);draw();
 };
 canvas.onpointermove=e=>{
  if(!geometry)return;const p=point(e);
  if(!drag){const type=cropHit(crop,p,geometry.w,geometry.h);canvas.style.cursor=type==='move'?'move':type?type+'-resize':'default';return;}
  if(e.pointerId!==drag.id)return;e.preventDefault();crop=dragCrop(drag.start,drag.type,p.x-drag.point.x,p.y-drag.point.y);draw();
 };
 const finish=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);draw();};
 canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=finish;
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;updateModes();draw();});for(const id of ['brightness','contrast','threshold'])$(id).oninput=()=>{filterCache=null;draw();};$('reset-crop').onclick=()=>{crop={x:0,y:0,w:1,h:1};draw();};$('reset-image').onclick=()=>{working=base;defaults();draw();};$('rotate').onclick=()=>{const c=document.createElement('canvas');c.width=working.height;c.height=working.width;const x=c.getContext('2d');x.translate(c.width,0);x.rotate(Math.PI/2);x.drawImage(working,0,0);working=c;crop={x:0,y:0,w:1,h:1};filterCache=null;draw();};$('close-image').onclick=()=>dialog.close();
 $('save-image').onclick=async()=>{const button=$('save-image');button.disabled=true;try{const r=cropRect(crop,working.width,working.height),out=document.createElement('canvas');out.width=r.w;out.height=r.h;out.getContext('2d').drawImage(filtered(),r.x,r.y,r.w,r.h,0,0,r.w,r.h);const blob=await new Promise((res,rej)=>out.toBlob(b=>b?res(b):rej(Error('Could not create edited image.')),'image/jpeg',.94));await onSave(record,blob);dialog.close();}catch(e){onError(e);}finally{button.disabled=false;}};new ResizeObserver(()=>draw()).observe(dialog);
 return async f=>{record=f;try{const bitmap=await createImageBitmap(f.original,{imageOrientation:'from-image'}),scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));base=document.createElement('canvas');base.width=Math.round(bitmap.width*scale);base.height=Math.round(bitmap.height*scale);base.getContext('2d').drawImage(bitmap,0,0,base.width,base.height);bitmap.close();working=base;defaults();dialog.showModal();draw();}catch{onError(Error('This image format cannot be edited here. The original is saved. Try a JPEG or PNG.'));}};
}
