import test from 'node:test';
import assert from 'node:assert/strict';
import {cropHit,dragCrop} from '../docs/expenses/crop-interaction.mjs';
test('full-image corners can be grabbed from the surrounding gutter',()=>{
 const c={x:0,y:0,w:1,h:1};
 assert.equal(cropHit(c,{x:-20/260,y:-15/350},260,350),'nw');
 assert.equal(cropHit(c,{x:1+20/260,y:1+15/350},260,350),'se');
 assert.equal(cropHit(c,{x:.5,y:-20/350},260,350),'n');
 assert.equal(cropHit(c,{x:-1,y:-1},260,350),null);
});
test('edge drag changes only the selected edge and preserves the initial grab offset',()=>{
 const c={x:.1,y:.2,w:.7,h:.6};
 assert.deepEqual(dragCrop(c,'nw',0,0),c);
 const moved=dragCrop(c,'e',.1,.25);
 assert.equal(moved.y,c.y);assert.equal(moved.h,c.h);assert(Math.abs(moved.w-.8)<1e-9);
 const corner=dragCrop(c,'nw',.1,.1);
 assert(Math.abs(corner.x-.2)<1e-9);assert(Math.abs(corner.y-.3)<1e-9);
 assert(Math.abs(corner.x+corner.w-.8)<1e-9);
});
test('moving and resizing clamp to the image and retain a positive crop',()=>{
 const c={x:.2,y:.2,w:.5,h:.5};
 assert.deepEqual(dragCrop(c,'move',5,-5),{x:.5,y:0,w:.5,h:.5});
 for(const type of ['nw','ne','sw','se','n','s','e','w']){
  for(const delta of [-5,5]){
   const r=dragCrop(c,type,delta,delta);
   assert(r.x>=0&&r.y>=0&&r.x+r.w<=1.00001&&r.y+r.h<=1.00001);
   assert(r.w>=.03999&&r.h>=.03999);
  }
 }
});
