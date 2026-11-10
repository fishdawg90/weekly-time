import test from 'node:test';
import assert from 'node:assert/strict';
import {imageEditor} from '../docs/expenses/editor.mjs';
test('second non-primary touch starts pinch and lifting a finger never drags a corner',async()=>{
 const previous=new Map(['document','window','innerHeight','requestAnimationFrame','ResizeObserver','createImageBitmap','ImageData'].map(k=>[k,globalThis[k]]));
 const rendered=[],frames=[],nodes=new Map(),ctx=new Proxy({getImageData:()=>({width:11,height:11,data:new Uint8ClampedArray(11*11*4)}),putImageData:d=>rendered.push(d)}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),events={};
 const canvas={parentElement:{clientWidth:400},style:{},getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:400,height:368}),setPointerCapture(){},hasPointerCapture:()=>false,addEventListener:(k,fn)=>events[k]=fn};
 const dialog={open:false,showModal(){this.open=true;},addEventListener(){}};
 const get=id=>{if(!nodes.has(id))nodes.set(id,{value:100,classList:{toggle(){}},textContent:'',disabled:false});return nodes.get(id);};
 const flush=()=>{let count=0;while(frames.length&&count++<10)frames.shift()();};
 const pointer=(id,x,y,primary=true)=>({pointerId:id,clientX:x,clientY:y,button:0,isPrimary:primary,preventDefault(){}});
 try{
  globalThis.document={getElementById:get,querySelectorAll:()=>[],createElement:()=>({getContext:()=>ctx})};
  globalThis.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};
  globalThis.window={devicePixelRatio:1};globalThis.innerHeight=800;
  globalThis.requestAnimationFrame=fn=>(frames.push(fn),frames.length);
  globalThis.ResizeObserver=class{observe(){}};
  globalThis.createImageBitmap=async()=>({width:700,height:1100,close(){}});
  const open=imageEditor({dialog,canvas,onSave(){},onError:e=>{throw e;}});
  await open({original:{}});assert.equal(get('crop-zoom-level').textContent,'100%');
  canvas.onpointerdown(pointer(1,150,180));canvas.onpointerdown(pointer(2,250,180,false));
  canvas.onpointermove(pointer(1,100,180));canvas.onpointermove(pointer(2,300,180,false));flush();
  assert.equal(get('crop-zoom-level').textContent,'200%');
  canvas.onpointerup(pointer(2,300,180,false));
  canvas.onpointermove(pointer(1,120,190));flush();
  assert.equal(get('crop-zoom-level').textContent,'200%');
  canvas.onpointerup(pointer(1,120,190));
  get('crop-fit').onclick();assert.equal(get('crop-zoom-level').textContent,'100%');
  get('crop-preview').onclick();assert.equal(get('crop-preview').ariaPressed,'true');assert.equal(rendered.length,1);
  get('crop-zoom-in').onclick();assert.equal(rendered.length,1,'zoom reuses the corrected preview');
  get('brightness').value=120;get('brightness').oninput();assert.equal(rendered.length,2,'enhancement changes refresh the preview');
  get('crop-adjust').onclick();assert.equal(get('crop-adjust').ariaPressed,'true');
 }finally{for(const [k,v] of previous)if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
});
