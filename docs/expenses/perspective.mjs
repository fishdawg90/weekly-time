export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export const fullQuad=()=>[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
export function validQuad(q){
 if(q.length!==4||q.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return false;
 // Keep a convex clockwise outline: no crossed corners or collapsed edges.
 return q.every((p,i)=>{const b=q[(i+1)%4],c=q[(i+2)%4];return (b.x-p.x)*(c.y-b.y)-(b.y-p.y)*(c.x-b.x)>.0001;});
}
export function quadHandles(q){
 return [...q.map((p,i)=>({type:i,...p})),...q.map((p,i)=>({type:'edge'+i,x:(p.x+q[(i+1)%4].x)/2,y:(p.y+q[(i+1)%4].y)/2}))];
}
export function quadHit(q,p,w,h){
 const nearest=quadHandles(q).map(a=>({...a,d:Math.hypot((a.x-p.x)*w,(a.y-p.y)*h)})).sort((a,b)=>a.d-b.d)[0];
 if(nearest.d<=30)return nearest.type;
 let inside=true;
 for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],dx=(b.x-a.x)*w,dy=(b.y-a.y)*h,px=(p.x-a.x)*w,py=(p.y-a.y)*h,t=clamp((px*dx+py*dy)/(dx*dx+dy*dy),0,1);
  if(Math.hypot(px-t*dx,py-t*dy)<16)return 'edge'+i;
  if((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)<0)inside=false;
 }
 return inside?'move':null;
}
export function dragQuad(start,type,dx,dy,fallback=start){
 let indices=typeof type==='number'?[type]:type==='move'?[0,1,2,3]:[Number(type.slice(4)),(Number(type.slice(4))+1)%4];
 const selected=start.filter((_,i)=>indices.includes(i));
 dx=clamp(dx,-Math.min(...selected.map(p=>p.x)),1-Math.max(...selected.map(p=>p.x)));
 dy=clamp(dy,-Math.min(...selected.map(p=>p.y)),1-Math.max(...selected.map(p=>p.y)));
 const q=start.map((p,i)=>indices.includes(i)?{x:p.x+dx,y:p.y+dy}:{...p});
 return validQuad(q)?q:fallback.map(p=>({...p}));
}
// Map the unit square to the four source corners, with perspective correction.
export function quadMatrix(q){
 const [p0,p1,p2,p3]=q,dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x,dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
 const det=dx1*dy2-dx2*dy1;
 if(Math.abs(det)<1e-12)throw Error('Move the corners apart before saving.');
 const g=(dx3*dy2-dx2*dy3)/det,h=(dx1*dy3-dx3*dy1)/det;
 return [p1.x-p0.x+g*p1.x,p3.x-p0.x+h*p3.x,p0.x,p1.y-p0.y+g*p1.y,p3.y-p0.y+h*p3.y,p0.y,g,h];
}
export function project(m,u,v){const d=m[6]*u+m[7]*v+1;return {x:(m[0]*u+m[1]*v+m[2])/d,y:(m[3]*u+m[4]*v+m[5])/d};}
export function outputSize(q,width,height){
 const len=(a,b)=>Math.hypot((a.x-b.x)*width,(a.y-b.y)*height);
 const w=Math.max(len(q[0],q[1]),len(q[3],q[2])),h=Math.max(len(q[0],q[3]),len(q[1],q[2])),scale=Math.min(1,2400/Math.max(w,h));
 return {width:Math.max(2,Math.round(w*scale)),height:Math.max(2,Math.round(h*scale))};
}
export function rectifyPixels(source,q){
 if(!validQuad(q))throw Error('Place the four corners around your receipt.');
 const {width,height}=outputSize(q,source.width,source.height),data=new Uint8ClampedArray(width*height*4),m=quadMatrix(q),sw=source.width,sh=source.height,src=source.data;
 for(let y=0;y<height;y++){const v=y/(height-1);
  for(let x=0;x<width;x++){const u=x/(width-1),d=m[6]*u+m[7]*v+1,sx=clamp((m[0]*u+m[1]*v+m[2])/d*(sw-1),0,sw-1),sy=clamp((m[3]*u+m[4]*v+m[5])/d*(sh-1),0,sh-1),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,a=(iy*sw+ix)*4,b=(iy*sw+Math.min(ix+1,sw-1))*4,c=(Math.min(iy+1,sh-1)*sw+ix)*4,e=(Math.min(iy+1,sh-1)*sw+Math.min(ix+1,sw-1))*4,out=(y*width+x)*4;
   for(let k=0;k<4;k++)data[out+k]=(src[a+k]*(1-fx)+src[b+k]*fx)*(1-fy)+(src[c+k]*(1-fx)+src[e+k]*fx)*fy;
  }
 }
 return {data,width,height};
}
export function zoomAt(view,g,anchor,nextZoom){
 const zoom=clamp(nextZoom,1,6),ix=(anchor.x-g.x)/g.w,iy=(anchor.y-g.y)/g.h,w=g.baseW*zoom,h=g.baseH*zoom;
 return {zoom,panX:anchor.x-(g.width-w)/2-ix*w,panY:anchor.y-(g.height-h)/2-iy*h};
}
export function pinchView(start,g,first,second){
 const mid={x:(first.x+second.x)/2,y:(first.y+second.y)/2},distance=Math.hypot(first.x-second.x,first.y-second.y);
 const next=zoomAt(start.view,g,start.mid,start.view.zoom*distance/Math.max(1,start.distance));
 next.panX+=mid.x-start.mid.x;next.panY+=mid.y-start.mid.y;return next;
}
