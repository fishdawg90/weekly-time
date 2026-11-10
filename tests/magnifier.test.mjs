import test from 'node:test';
import assert from 'node:assert/strict';
import {magnifierPlacement,paintMagnifier} from '../docs/expenses/magnifier.mjs';
test('the lens stays above the finger and moves aside near the top',()=>{
 const bounds={left:0,top:0,right:390,bottom:800},size=124;
 const normal=magnifierPlacement({x:200,y:400},bounds,size);
 assert(normal.top+size<=400-40);
 const top=magnifierPlacement({x:40,y:35},bounds,size);
 assert(top.left>=40+40);
 for(const point of [{x:0,y:0},{x:390,y:0},{x:195,y:0},{x:0,y:799},{x:389,y:799}]){
  const r=magnifierPlacement(point,bounds,size);
  assert(r.left>=8&&r.top>=8&&r.left+size<=382&&r.top+size<=792);
 }
});
test('the crosshair centre samples the actual image corner at high resolution',()=>{
 const draws=[],moves=[],ctx=new Proxy({drawImage:(...args)=>draws.push(args),moveTo:(...args)=>moves.push(args)},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const canvas={getContext:()=>ctx},source={width:2000,height:3000},point={x:.2,y:.3};
 paintMagnifier(canvas,source,point,2,124,2);
 assert.equal(canvas.width,248);assert.equal(canvas.height,248);
 const [image,x,y,w,h]=draws[0];assert.equal(image,source);
 assert.equal(x+point.x*w,62);assert.equal(y+point.y*h,62);
 assert(moves.some(([x,y])=>x===56&&y===62));assert(moves.some(([x,y])=>x===62&&y===56));
});
