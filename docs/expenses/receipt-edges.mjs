// Conservative, local paper detection on a small raster. No upload or model download.
import {validQuad} from './perspective.mjs?v=7';
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function hull(points){
 points.sort((a,b)=>a.x-b.x||a.y-b.y);const lo=[],hi=[];
 for(const p of points){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
 for(let i=points.length-1;i>=0;i--){const p=points[i];while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}
 lo.pop();hi.pop();return lo.concat(hi);
}
const area=q=>Math.abs(q.reduce((s,p,i)=>{const b=q[(i+1)%q.length];return s+p.x*b.y-p.y*b.x;},0))/2;
function corners(points){
 const q=hull(points);if(q.length<4)return null;const original=area(q);
 while(q.length>4){let best=Infinity,index=0;for(let i=0;i<q.length;i++){const loss=Math.abs(cross(q[(i+q.length-1)%q.length],q[i],q[(i+1)%q.length]));if(loss<best){best=loss;index=i;}}q.splice(index,1);}
 if(area(q)/original<.88)return null;
 // Consistent top-left, top-right, bottom-right, bottom-left order.
 let first=0;for(let i=1;i<4;i++)if(q[i].x+q[i].y<q[first].x+q[first].y)first=i;
 return q.slice(first).concat(q.slice(0,first));
}
export function detectReceipt({data,width:w,height:h}){
 if(w<20||h<20||data.length!==w*h*4)return null;
 const n=w*h,grey=new Uint8Array(n),hist=new Uint32Array(256);let sum=0;
 for(let i=0;i<n;i++){const v=Math.round(data[i*4]*.2126+data[i*4+1]*.7152+data[i*4+2]*.0722);grey[i]=v;hist[v]++;sum+=v;}
 let left=0,weight=0,max=0,otsu=150;
 for(let t=0;t<255;t++){weight+=hist[t];left+=t*hist[t];if(!weight||weight===n)continue;const d=left/weight-(sum-left)/(n-weight),v=weight*(n-weight)*d*d;if(v>max){max=v;otsu=t;}}
 // Multiple thresholds tolerate shaded paper and different background tones.
 const thresholds=[...new Set([otsu+1,Math.round((otsu+255)/2),130,175,210,235])].filter(t=>t>30&&t<250);
 const seen=new Uint8Array(n),queue=new Int32Array(n);let best=null,bestScore=0;
 for(const threshold of thresholds){
  seen.fill(0);
  for(let seed=0;seed<n;seed++){
   if(seen[seed]||grey[seed]<threshold)continue;
   let tail=1;queue[0]=seed;seen[seed]=1;
   for(let head=0;head<tail;head++){const k=queue[head],x=k%w;
    for(const next of [x?k-1:-1,x<w-1?k+1:-1,k-w,k+w])if(next>=0&&next<n&&!seen[next]&&grey[next]>=threshold){seen[next]=1;queue[tail++]=next;}
   }
   if(tail<n*.055||tail>n*.96)continue;
   const boundary=[];for(let j=0;j<tail;j++){const k=queue[j],x=k%w,y=Math.floor(k/w);if(x===0||x===w-1||y===0||y===h-1||grey[k-1]<threshold||grey[k+1]<threshold||grey[k-w]<threshold||grey[k+w]<threshold)boundary.push({x,y});}
   const q=corners(boundary);if(!q)continue;const a=area(q),coverage=a/n;
   if(coverage<.065||coverage>.94||tail/a<.55)continue;
   // Reject cut-off photos, circles and tiny/degenerate shapes rather than guessing.
   if(q.filter(p=>p.x<2||p.y<2||p.x>w-3||p.y>h-3).length>1)continue;
   const normal=q.map(p=>({x:p.x/(w-1),y:p.y/(h-1)}));if(!validQuad(normal))continue;
   let contrast=0,supported=0,edges=0;
   const sample=(x,y)=>grey[Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x)))];
   for(let i=0;i<4;i++){const p=q[i],b=q[(i+1)%4],dx=b.x-p.x,dy=b.y-p.y,len=Math.hypot(dx,dy);if(len<Math.min(w,h)*.08){edges=-99;break;}
    const nx=-dy/len,ny=dx/len;let total=0;
    for(let j=1;j<20;j++){const x=p.x+dx*j/20,y=p.y+dy*j/20;const d=sample(x+nx*3,y+ny*3)-sample(x-nx*3,y-ny*3);total+=d;if(d>10)supported++;}
    contrast+=total/19;if(total/19>12)edges++;
   }
   if(edges<3||supported<44||contrast/4<14)continue;
   const score=Math.sqrt(coverage)*Math.min(contrast/4,100)*(supported/76);
   if(score>bestScore){bestScore=score;best=normal;}
  }
 }
 if(!best)return null;
 // A tiny outward margin protects print right beside the detected edge.
 const centre=best.reduce((s,p)=>({x:s.x+p.x/4,y:s.y+p.y/4}),{x:0,y:0});
 return best.map(p=>({x:Math.max(0,Math.min(1,centre.x+(p.x-centre.x)*1.012)),y:Math.max(0,Math.min(1,centre.y+(p.y-centre.y)*1.012))}));
}
