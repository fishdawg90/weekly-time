import test from 'node:test';
import assert from 'node:assert/strict';
import {fullQuad,validQuad,dragQuad,quadHit,quadMatrix,project,rectifyPixels,pinchView,zoomAt} from '../docs/expenses/perspective.mjs';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,a+' != '+b);
test('a corner moves independently and a crossed outline is rejected',()=>{
 const start=fullQuad(),q=dragQuad(start,0,.2,.1);
 assert.deepEqual(q[0],{x:.2,y:.1});
 assert.deepEqual(q.slice(1),start.slice(1));assert(validQuad(q));
 assert(!validQuad([start[0],start[2],start[1],start[3]]));
 assert.equal(quadHit(start,{x:-.05,y:-.03},300,400),0);
});
test('perspective transformation maps all four output corners to the chosen outline',()=>{
 const q=[{x:.2,y:.1},{x:.85,y:.2},{x:.95,y:.9},{x:.05,y:.8}],m=quadMatrix(q);
 for(const [i,u,v] of [[0,0,0],[1,1,0],[2,1,1],[3,0,1]]){
  const p=project(m,u,v);near(p.x,q[i].x);near(p.y,q[i].y);
 }
});
test('saving the full image preserves pixels; skewed output samples each selected source corner',()=>{
 const width=11,height=11,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data.set([x*20,y*20,100,255],i);}
 const source={width,height,data},identity=rectifyPixels(source,fullQuad());
 assert.equal(identity.width,width);assert.equal(identity.height,height);assert.deepEqual(identity.data,data);
 const q=[{x:.2,y:.1},{x:.8,y:.2},{x:.9,y:.9},{x:.1,y:.8}],out=rectifyPixels(source,q);
 const pixel=(x,y)=>[...out.data.slice((y*out.width+x)*4,(y*out.width+x)*4+2)];
 assert.deepEqual(pixel(0,0),[40,20]);assert.deepEqual(pixel(out.width-1,0),[160,40]);
 assert.deepEqual(pixel(out.width-1,out.height-1),[180,180]);assert.deepEqual(pixel(0,out.height-1),[20,160]);
});
test('pinch zoom follows the midpoint and clamps magnification without changing the outline',()=>{
 const g={x:100,y:50,w:200,h:300,baseW:200,baseH:300,width:400,height:400},view={zoom:1,panX:0,panY:0},start={view,mid:{x:200,y:200},distance:100};
 const result=pinchView(start,g,{x:130,y:210},{x:330,y:210});
 near(result.zoom,2);near(result.panX,30);near(result.panY,10);
 const anchored=zoomAt(view,g,{x:150,y:125},2);
 near((150-(400-400)/2-anchored.panX)/400,.25);
 near((125-(400-600)/2-anchored.panY)/600,.25);
 assert.equal(zoomAt(view,g,{x:200,y:200},99).zoom,6);
 assert.equal(zoomAt(view,g,{x:200,y:200},.1).zoom,1);
});
