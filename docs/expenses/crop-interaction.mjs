const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function cropHandles(c){const l=c.x,t=c.y,r=l+c.w,b=t+c.h,cx=(l+r)/2,cy=(t+b)/2;return [['nw',l,t],['ne',r,t],['sw',l,b],['se',r,b],['n',cx,t],['e',r,cy],['s',cx,b],['w',l,cy]];}
export function cropHit(c,p,width,height,radius=30){
 const nearest=cropHandles(c).map(([type,x,y])=>({type,d:Math.hypot((p.x-x)*width,(p.y-y)*height)})).sort((a,b)=>a.d-b.d)[0];
 if(nearest.d<=radius)return nearest.type;
 if(p.x>=c.x&&p.x<=c.x+c.w){if(Math.abs(p.y-c.y)*height<18)return 'n';if(Math.abs(p.y-c.y-c.h)*height<18)return 's';}
 if(p.y>=c.y&&p.y<=c.y+c.h){if(Math.abs(p.x-c.x)*width<18)return 'w';if(Math.abs(p.x-c.x-c.w)*width<18)return 'e';}
 return p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h?'move':null;
}
export function dragCrop(s,type,dx,dy){
 if(type==='move')return {...s,x:clamp(s.x+dx,0,1-s.w),y:clamp(s.y+dy,0,1-s.h)};
 let l=s.x,t=s.y,r=l+s.w,b=t+s.h;
 if(type.includes('w'))l=clamp(l+dx,0,r-.04);if(type.includes('e'))r=clamp(r+dx,l+.04,1);
 if(type.includes('n'))t=clamp(t+dy,0,b-.04);if(type.includes('s'))b=clamp(b+dy,t+.04,1);
 return {x:l,y:t,w:dx===0||!/[we]/.test(type)?s.w:r-l,h:dy===0||!/[ns]/.test(type)?s.h:b-t};
}
