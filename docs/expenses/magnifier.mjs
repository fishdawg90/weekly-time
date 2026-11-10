const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function magnifierPlacement(point,bounds,size=124){
 const gap=42,margin=8,left=bounds.left+margin,top=bounds.top+margin,right=bounds.right-margin,bottom=bounds.bottom-margin;
 let x=point.x-size/2,y=point.y-size-gap;
 if(y<top){
  if(point.x+gap+size<=right){x=point.x+gap;y=point.y-size/2;}
  else if(point.x-gap-size>=left){x=point.x-gap-size;y=point.y-size/2;}
  else y=point.y+gap;
 }
 return {left:clamp(x,left,right-size),top:clamp(y,top,bottom-size)};
}
export function paintMagnifier(canvas,source,point,scale,size=124,dpr=1){
 const resolution=Math.round(size*dpr);
 if(canvas.width!==resolution||canvas.height!==resolution){canvas.width=resolution;canvas.height=resolution;}
 const ctx=canvas.getContext('2d'),centre=size/2;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#192a25';ctx.fillRect(0,0,size,size);
 // Sample the image itself; never magnify the crop handles or the finger.
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,centre-point.x*source.width*scale,centre-point.y*source.height*scale,source.width*scale,source.height*scale);
 const crosshair=()=>{ctx.beginPath();for(const sign of [-1,1]){ctx.moveTo(centre+sign*6,centre);ctx.lineTo(centre+sign*22,centre);ctx.moveTo(centre,centre+sign*6);ctx.lineTo(centre,centre+sign*22);}ctx.stroke();};
 ctx.strokeStyle='#102e25';ctx.lineWidth=4;crosshair();ctx.strokeStyle='#fff';ctx.lineWidth=2;crosshair();
 ctx.beginPath();ctx.arc(centre,centre,2.5,0,Math.PI*2);ctx.fillStyle='#17685b';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
}
