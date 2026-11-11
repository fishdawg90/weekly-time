import {detectReceipt} from './receipt-edges.mjs?v=12';
import {magnifierPlacement,paintMagnifier} from './magnifier.mjs?v=12';
import {filterPixels} from './model.mjs?v=3';
import {clamp,fullQuad,quadHandles,quadHit,dragQuad,quadMatrix,project,rectifyPixels,zoomAt,pinchView} from './perspective.mjs?v=7';

export function imageEditor({dialog,canvas,onSave,onError}){
 let base,working,quad=fullQuad(),mode='colour',drag=null,record=null,filterCache=null,geometry=null,view={zoom:1,panX:0,panY:0},pinch=null,frame=null,previewing=false,previewCache=null,previewSource=null,previewQuad='',displayCache=null,displaySource=null,openGeneration=0;
 const pointers=new Map(),$=id=>document.getElementById(id),ctx=canvas.getContext('2d'),lens=$('crop-magnifier');
 const resetView=()=>{lens.hidden=true;view={zoom:1,panX:0,panY:0};pointers.clear();pinch=null;drag=null;};
 function defaults(){quad=fullQuad();resetView();previewing=false;previewCache=null;updateEditorMode();mode='colour';$('brightness').value=100;$('contrast').value=100;$('threshold').value=155;updateModes();}
 function updateModes(){document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('threshold-wrap').hidden=mode!=='bw';filterCache=null;}
 function filtered(){
  if(filterCache)return filterCache;
  const c=document.createElement('canvas');c.width=working.width;c.height=working.height;
  const x=c.getContext('2d',{willReadFrequently:true});x.filter='brightness('+$('brightness').value+'%) contrast('+$('contrast').value+'%)';x.drawImage(working,0,0);x.filter='none';
  if(mode!=='colour'){const d=x.getImageData(0,0,c.width,c.height);filterPixels(d.data,mode,Number($('threshold').value));x.putImageData(d,0,0);}
  return filterCache=c;
 }

 function displayImage(){const source=filtered();if(source!==displaySource){displaySource=source;displayCache=document.createElement('canvas');const scale=Math.min(1,1400/Math.max(source.width,source.height));displayCache.width=Math.round(source.width*scale);displayCache.height=Math.round(source.height*scale);displayCache.getContext('2d').drawImage(source,0,0,displayCache.width,displayCache.height);}return displayCache;}
 async function findEdges(){
  const generation=openGeneration,source=working,previous=quad;const button=$('detect-edges');button.disabled=true;
  $('crop-instructions').textContent='Finding receipt edges…';
  try{
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(!dialog.open||generation!==openGeneration)return;
   const sample=document.createElement('canvas'),scale=Math.min(1,480/Math.max(source.width,source.height));sample.width=Math.round(source.width*scale);sample.height=Math.round(source.height*scale);
   const x=sample.getContext('2d',{willReadFrequently:true});x.drawImage(source,0,0,sample.width,sample.height);
   const found=detectReceipt(x.getImageData(0,0,sample.width,sample.height));
   if(generation!==openGeneration||source!==working||quad!==previous||pointers.size)return;
   if(found){quad=found;resetView();previewCache=null;updateEditorMode();$('crop-instructions').textContent='Edges estimated · Adjust corners to check';}
   else{updateEditorMode();$('crop-instructions').textContent='No clear outline · Drag corners to crop';}
   draw();
  }catch{updateEditorMode();}finally{button.disabled=false;}
 }
 $('detect-edges').onclick=()=>{if(previewing)changeEditorMode(false);findEdges();};
 function updateEditorMode(){
  $('crop-adjust').ariaPressed=String(!previewing);$('crop-preview').ariaPressed=String(previewing);
  $('crop-adjust').classList.toggle('active',!previewing);$('crop-preview').classList.toggle('active',previewing);
  $('crop-instructions').textContent=previewing?'Straightened preview · Pinch to inspect':'Drag corners · Pinch to zoom';
 }
 function correctedImage(maxDimension){
  const source=filtered().getContext('2d').getImageData(0,0,working.width,working.height),result=rectifyPixels(source,quad,maxDimension),out=document.createElement('canvas');out.width=result.width;out.height=result.height;out.getContext('2d').putImageData(new ImageData(result.data,result.width,result.height),0,0);
  return out;
 }
 function previewImage(){
  const source=filtered(),key=JSON.stringify(quad);
  if(!previewCache||source!==previewSource||key!==previewQuad){previewCache=correctedImage(1000);previewSource=source;previewQuad=key;}
  return previewCache;
 }
 function updateZoomControls(){
  $('crop-zoom-level').textContent=Math.round(view.zoom*100)+'%';
  $('crop-zoom-out').disabled=view.zoom<=1;$('crop-zoom-in').disabled=view.zoom>=6;
 }
 function changeEditorMode(value){previewing=value;resetView();updateEditorMode();draw();}
 $('crop-adjust').onclick=()=>changeEditorMode(false);$('crop-preview').onclick=()=>changeEditorMode(true);

 function updateMagnifier(){
  if(!dialog.open||previewing||!drag||typeof drag.type!=='number'||pointers.size!==1){lens.hidden=true;return;}
  const pointer=pointers.get(drag.id);if(!pointer){lens.hidden=true;return;}
  const r=canvas.getBoundingClientRect(),modal=dialog.getBoundingClientRect(),size=Math.min(124,innerWidth*.34);
  const point={x:r.left+pointer.x*r.width/geometry.width,y:r.top+pointer.y*r.height/geometry.height};
  const bounds={left:Math.max(0,modal.left),top:Math.max(0,modal.top),right:Math.min(innerWidth,modal.right),bottom:Math.min(innerHeight,modal.bottom)};
  const position=magnifierPlacement(point,bounds,size);
  lens.style.width=size+'px';lens.style.height=size+'px';lens.style.left=position.left+'px';lens.style.top=position.top+'px';
  paintMagnifier(lens,filtered(),quad[drag.type],Math.max(1.5,geometry.w/working.width*3),size,window.devicePixelRatio||1);
  lens.hidden=false;
 }
 function schedule(){if(frame===null)frame=requestAnimationFrame(()=>{frame=null;draw();});}
 function draw(){
  if(!working||!dialog.open){lens.hidden=true;return;}
  const displayed=previewing?previewImage():displayImage();
  const width=Math.max(100,canvas.parentElement.clientWidth),height=Math.max(200,Math.min(450,innerHeight*.46)),scale=Math.min((width-64)/displayed.width,(height-64)/displayed.height),baseW=displayed.width*scale,baseH=displayed.height*scale;
  // Panning can bring any zoomed corner into view without losing the image.
  view.panX=clamp(view.panX,-baseW*(view.zoom-1)/2,baseW*(view.zoom-1)/2);
  view.panY=clamp(view.panY,-baseH*(view.zoom-1)/2,baseH*(view.zoom-1)/2);
  const w=baseW*view.zoom,h=baseH*view.zoom,x=(width-w)/2+view.panX,y=(height-h)/2+view.panY;
  geometry={width,height,baseW,baseH,w,h,x,y};
  const dpr=window.devicePixelRatio||1,rw=Math.round(width*dpr),rh=Math.round(height*dpr);
  if(canvas.width!==rw||canvas.height!==rh){canvas.width=rw;canvas.height=rh;}
  canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#192a25';ctx.fillRect(0,0,width,height);ctx.drawImage(displayed,x,y,w,h);
  updateZoomControls();if(previewing){lens.hidden=true;return;}
  const screen=p=>({x:x+p.x*w,y:y+p.y*h}),corners=quad.map(screen);
  ctx.beginPath();ctx.rect(0,0,width,height);ctx.moveTo(corners[0].x,corners[0].y);for(const p of corners.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fillStyle='#061c17a6';ctx.fill('evenodd');
  ctx.beginPath();ctx.moveTo(corners[0].x,corners[0].y);for(const p of corners.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.strokeStyle='#b4f6cc';ctx.lineWidth=2;ctx.stroke();
  const matrix=quadMatrix(quad);ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;
  for(let i=1;i<3;i++){for(const [a,b] of [[project(matrix,i/3,0),project(matrix,i/3,1)],[project(matrix,0,i/3),project(matrix,1,i/3)]]){const p=screen(a),q=screen(b);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}
  for(const handle of quadHandles(quad)){
   const p=screen(handle),selected=drag?.type===handle.type,isCorner=typeof handle.type==='number';
   ctx.beginPath();ctx.arc(p.x,p.y,selected?23:19,0,Math.PI*2);ctx.fillStyle=selected?'#b4f6cc88':'#ffffff22';ctx.fill();
   ctx.beginPath();ctx.arc(p.x,p.y,isCorner?12:8,0,Math.PI*2);ctx.fillStyle=selected?'#b4f6cc':'#fff';ctx.fill();ctx.strokeStyle='#17685b';ctx.lineWidth=2;ctx.stroke();
   if(isCorner){ctx.fillStyle='#17685b';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(handle.type+1),p.x,p.y);}
  }
  updateMagnifier();
 }
 function screenPoint(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*geometry.width/r.width,y:(e.clientY-r.top)*geometry.height/r.height};}
 const imagePoint=p=>({x:(p.x-geometry.x)/geometry.w,y:(p.y-geometry.y)/geometry.h});
 function startPinch(){
  const [a,b]=[...pointers.values()];drag=null;lens.hidden=true;
  pinch={view:{...view},geometry:{...geometry},mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y)};
 }
 canvas.onpointerdown=e=>{
  if(!geometry||e.button!==0)return;e.preventDefault();
  const p=screenPoint(e);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);
  if(pointers.size>=2){startPinch();schedule();return;}
  const point=imagePoint(p),hit=previewing?null:quadHit(quad,point,geometry.w,geometry.h);
  const type=hit===null||hit==='move'&&view.zoom>1?'pan':hit;
  drag={type,point,start:quad.map(p=>({...p})),screen:p,view:{...view},id:e.pointerId};draw();
 };
 canvas.onpointermove=e=>{
  if(!geometry)return;const p=screenPoint(e);
  if(!pointers.has(e.pointerId)){const hit=previewing?null:quadHit(quad,imagePoint(p),geometry.w,geometry.h);canvas.style.cursor=hit===null||hit==='move'?'grab':'crosshair';return;}
  e.preventDefault();pointers.set(e.pointerId,p);
  if(pointers.size>=2&&pinch){const [a,b]=[...pointers.values()];view=pinchView(pinch,pinch.geometry,a,b);schedule();return;}
  if(!drag||e.pointerId!==drag.id)return;
  if(drag.type==='pan'){view={...drag.view,panX:drag.view.panX+p.x-drag.screen.x,panY:drag.view.panY+p.y-drag.screen.y};}
  else{const point=imagePoint(p);quad=dragQuad(quad,drag.type,point.x-drag.point.x,point.y-drag.point.y,quad);drag.point=point;}
  schedule();
 };
 function finish(e){
  if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);drag=null;pinch=null;lens.hidden=true;
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  // Wait for the remaining finger to lift, so ending a pinch never moves a corner.
  if(pointers.size>=2)startPinch();schedule();
 }
 canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=finish;
 canvas.addEventListener('wheel',e=>{if(!geometry)return;e.preventDefault();view=zoomAt(view,geometry,screenPoint(e),view.zoom*Math.exp(-e.deltaY*.002));draw();},{passive:false});
 function setZoom(multiplier){if(!geometry)return;view=zoomAt(view,geometry,{x:geometry.width/2,y:geometry.height/2},view.zoom*multiplier);draw();}
 $('crop-zoom-in').onclick=()=>setZoom(1.5);$('crop-zoom-out').onclick=()=>setZoom(1/1.5);$('crop-fit').onclick=()=>{resetView();draw();};
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;updateModes();draw();});
 for(const id of ['brightness','contrast','threshold'])$(id).oninput=()=>{filterCache=null;draw();};
 $('reset-crop').onclick=()=>{quad=fullQuad();resetView();draw();};
 $('reset-image').onclick=()=>{working=base;defaults();draw();};
 $('rotate').onclick=()=>{const c=document.createElement('canvas');c.width=working.height;c.height=working.width;const x=c.getContext('2d');x.translate(c.width,0);x.rotate(Math.PI/2);x.drawImage(working,0,0);working=c;quad=fullQuad();resetView();filterCache=null;draw();};
 $('close-image').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{pointers.clear();drag=null;pinch=null;lens.hidden=true;});
 $('save-image').onclick=async()=>{
  const button=$('save-image');button.disabled=true;button.textContent='Straightening…';
  try{
   // Let the busy state paint before resampling the image.
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const out=correctedImage(2400);
   const blob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(Error('Could not create edited image.')),'image/jpeg',.94));
   await onSave(record,blob);dialog.close();
  }catch(e){onError(e);}finally{button.disabled=false;button.textContent='Save scan';}
 };
 new ResizeObserver(()=>{if(pointers.size){pointers.clear();pinch=null;drag=null;}schedule();}).observe(canvas.parentElement);
 return async f=>{
  record=f;openGeneration++;
  try{
   const bitmap=await createImageBitmap(f.original,{imageOrientation:'from-image'}),scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));base=document.createElement('canvas');base.width=Math.round(bitmap.width*scale);base.height=Math.round(bitmap.height*scale);base.getContext('2d').drawImage(bitmap,0,0,base.width,base.height);bitmap.close();working=base;defaults();dialog.showModal();draw();await findEdges();
  }catch(e){onError(Error('This image format cannot be edited here. The original is saved. Try a JPEG or PNG.'));}
 };
}
