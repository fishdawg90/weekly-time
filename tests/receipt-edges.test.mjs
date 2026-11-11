import test from 'node:test';import assert from 'node:assert/strict';
import {detectReceipt} from '../docs/expenses/receipt-edges.mjs';
function photo(q,{w=240,h=320,paper=235,bg=70,text=true}={}){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const inside=q&&q.every((p,i)=>{const b=q[(i+1)%4];return (b.x-p.x)*(y-p.y)-(b.y-p.y)*(x-p.x)>=0;});let c=inside?paper:bg;if(inside&&text&&y%16<3&&x>85&&x<155)c=45;const k=(y*w+x)*4;data[k]=data[k+1]=data[k+2]=c;data[k+3]=255;}return {data,width:w,height:h};}
const q=[{x:70,y:25},{x:185,y:43},{x:165,y:293},{x:48,y:270}];
test('finds a perspective receipt around print rather than cropping to the text',()=>{const r=detectReceipt(photo(q));assert(r);for(let i=0;i<4;i++){assert(Math.abs(r[i].x-q[i].x/239)<.025);assert(Math.abs(r[i].y-q[i].y/319)<.025);}});
test('detects shaded paper and a light table with enough contrast',()=>{for(const [paper,bg] of [[175,50],[240,205]])assert(detectReceipt(photo(q,{paper,bg})));});
test('leaves uniform, almost full-frame, and low-contrast photos alone',()=>{assert.equal(detectReceipt(photo(null)),null);assert.equal(detectReceipt(photo(q,{paper:210,bg:205,text:false})),null);assert.equal(detectReceipt(photo([{x:0,y:0},{x:239,y:0},{x:239,y:319},{x:0,y:319}])),null);});
