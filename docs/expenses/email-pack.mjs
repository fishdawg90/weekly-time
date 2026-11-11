import {oracleTSV,oracleJSON,mileageTSV,ready,sums} from './model.mjs?v=13';
import {safeName} from './pack.mjs?v=13';
export function emailSummary(group,items){
 return [group.name,'Expense summary',...Object.entries(sums(items)).map(([c,n])=>`${c} ${n.toFixed(2)}`),'',...items.flatMap((i,n)=>[
  `${String(n+1).padStart(3,'0')}. ${i.description||'No justification'}`,
  `Date: ${i.date||'Missing'} | ${i.currency} ${i.amount||'Missing'} | ${i.reference||'No expense type'}`,
  ...(i.mileage?[`Journey: ${i.mileage.from} → ${i.mileage.to} | ${i.mileage.miles} miles at GBP 0.25/mile`]:[]),
  `Status: ${ready(i)?'Ready':'Draft - check details before claiming'}`,
  ...(i.text?['Receipt text: '+i.text]:[]),'']),
  'Receipts are attached separately. Keep the downloadable ZIP for the full backup, including original and edited files.'
 ].join('\n');
}
async function emailImage(blob){
 const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});
 try{const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);return await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error('Could not prepare receipt for email.')),'image/jpeg',.92));}finally{bitmap.close();}
}
export async function emailPack(group,items,getFile,convertImage=emailImage){
 const files=[],prefix=safeName(group.name),text=(name,value)=>new File([value],prefix+'-'+name,{type:'text/plain'});
 files.push(text('summary.txt',emailSummary(group,items)));
 const receipts=items.filter(i=>!i.mileage),mileage=items.filter(i=>i.mileage);
 if(receipts.length){files.push(text('oracle.txt',receipts.every(ready)?oracleTSV(items):'Receipt expenses are incomplete. Complete and check them before copying to Oracle.'));files.push(text('oracle-expenses.txt',JSON.stringify(oracleJSON(items),null,2)));}
 if(mileage.length)files.push(text('oracle-mileage.txt',mileage.every(ready)?mileageTSV(mileage):'Mileage is incomplete. Complete and check each leg before copying to Oracle.'));
 for(let n=0;n<items.length;n++)for(let a=0;a<items[n].attachments.length;a++){
  const record=await getFile(items[n].attachments[a]);if(!record)throw Error('A receipt is missing. Check expense '+(n+1)+'.');
  const source=record.edited||record.original,label=String(n+1).padStart(3,'0')+'-'+(a+1);
  if(source.type==='application/pdf'||/\.pdf$/i.test(record.name))files.push(new File([source],label+'-receipt.pdf',{type:'application/pdf'}));
  else if(source.type.startsWith('image/'))files.push(new File([await convertImage(source)],label+'-receipt.jpg',{type:'image/jpeg'}));
  else throw Error('This receipt cannot be prepared for email: '+record.name);
 }
 return files;
}
