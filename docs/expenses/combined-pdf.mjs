import {imagePDF} from './pdf-writer.mjs?v=16';
import {ready,sums} from './model.mjs?v=13';
const WIDTH=1240,HEIGHT=1754,MARGIN=80;
function sheet(){const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.fillStyle='#24272c';ctx.font='26px system-ui';return {canvas,ctx,links:[]};}
async function raster(page){const blob=await new Promise((res,rej)=>page.canvas.toBlob(b=>b?res(b):rej(Error('Could not create PDF page.')),'image/jpeg',.94));const bytes=new Uint8Array(await blob.arrayBuffer());page.canvas.width=1;return {bytes,width:WIDTH,height:HEIGHT,links:page.links};}
function wrap(ctx,text,width){const lines=[];for(const paragraph of String(text).split(/\r?\n/)){let line='';for(const word of paragraph.split(/\s+/)){if(ctx.measureText(word).width>width){if(line){lines.push(line);line='';}for(const char of word){if(line&&ctx.measureText(line+char).width>width){lines.push(line);line='';}line+=char;}}else if(line&&ctx.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}lines.push(line);}return lines;}
export async function combinedPDF(group,items,getFile,copyURL){
 const pages=[];let page=sheet(),y=MARGIN;
 async function line(text,size=26,bold=false){page.ctx.font=`${bold?'600 ':''}${size}px system-ui`;for(const row of wrap(page.ctx,text,WIDTH-MARGIN*2)){if(y+size>HEIGHT-MARGIN){pages.push(await raster(page));page=sheet();y=MARGIN;page.ctx.font=`${bold?'600 ':''}${size}px system-ui`;}page.ctx.fillText(row,MARGIN,y+size);y+=size*1.5;}}
 await line(group.name,42,true);await line('Expenses and receipt evidence',28);y+=18;
 await line(Object.entries(sums(items)).map(([c,n])=>`${c} ${n.toFixed(2)}`).join('   ·   '),30,true);
 await line(`${items.filter(ready).length} of ${items.length} items ready`,24);y+=20;
 if(copyURL){await line('Copy for Oracle',30,true);await line('Open the link below on your work computer. If asked, tap Copy expenses or Copy mileage.',24);page.ctx.font='600 28px system-ui';page.ctx.fillStyle='#245b85';const label='Open Oracle text and copy →';page.ctx.fillText(label,MARGIN,y+28);page.links.push({rect:[MARGIN,y,WIDTH-MARGIN*2,48],url:copyURL});y+=72;page.ctx.fillStyle='#24272c';}
 else await line('Draft pack: complete and review the items to enable an Oracle copy link.',24);
 await line('The copy link contains a snapshot of this pack. Check it before submitting. The ZIP download retains originals and a full backup.',22);y+=24;
 for(let n=0;n<items.length;n++){const i=items[n];await line(`${String(n+1).padStart(3,'0')} · ${i.description||'No justification'}`,28,true);await line(`${i.date||'No date'}   |   ${i.currency} ${i.amount||'—'}   |   ${i.reference||'No expense type'}`,24);if(i.mileage)await line(`${i.mileage.from} → ${i.mileage.to} · ${i.mileage.miles} miles at GBP 0.25/mile`,24);await line(ready(i)?'Ready':'Draft – check details before claiming',22);if(i.text)await line('Receipt text: '+i.text,22);if(!i.attachments.length&&!i.text)await line(i.mileage?'Mileage – no receipt required':i.noReceipt?'No receipt / evidence not required':'No receipt attached',22);y+=20;}
 pages.push(await raster(page));
 async function receiptPage(source,n,a,extra=''){
  const p=sheet();p.ctx.font='600 30px system-ui';p.ctx.fillText(`Expense ${String(n+1).padStart(3,'0')} · Receipt ${a+1}${extra}`,MARGIN,65);p.ctx.font='22px system-ui';const label=items[n].description||items[n].reference||'Receipt';p.ctx.fillText(wrap(p.ctx,label,WIDTH-MARGIN*2)[0],MARGIN,103);
  const width=source.width,height=source.height,scale=Math.min((WIDTH-MARGIN*2)/width,(HEIGHT-220)/height);p.ctx.drawImage(source,(WIDTH-width*scale)/2,150,width*scale,height*scale);pages.push(await raster(p));
 }
 for(let n=0;n<items.length;n++)for(let a=0;a<items[n].attachments.length;a++){
  const f=await getFile(items[n].attachments[a]);if(!f)throw Error('A receipt is missing for expense '+(n+1));const source=f.edited||f.original;
  if(source.type==='application/pdf'||/\.pdf$/i.test(f.name)){
   const pdf=await import('./vendor/pdfjs/pdf.mjs');pdf.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
   const task=pdf.getDocument({data:new Uint8Array(await source.arrayBuffer()),standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href,isEvalSupported:false,disableWorkerRendering:true});task.onPassword=()=>task.destroy();
   try{const doc=await task.promise;for(let k=1;k<=doc.numPages;k++){const p=await doc.getPage(k),natural=p.getViewport({scale:1}),viewport=p.getViewport({scale:Math.min(3,2400/Math.max(natural.width,natural.height))}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const ctx=canvas.getContext('2d');await p.render({canvasContext:ctx,viewport,background:'rgb(255,255,255)'}).promise;await receiptPage(canvas,n,a,` · Page ${k}/${doc.numPages}`);canvas.width=1;p.cleanup();}}catch{throw Error('Could not combine PDF receipt '+f.name+'. If it is password-protected, add an unlocked copy.');}finally{await task.destroy();}
  }else if(source.type.startsWith('image/')){const bitmap=await createImageBitmap(source,{imageOrientation:'from-image'});try{await receiptPage(bitmap,n,a);}finally{bitmap.close();}}
  else throw Error('Unsupported receipt: '+f.name);
 }
 return imagePDF(pages);
}
