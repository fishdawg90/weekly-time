import {combinedPDF} from './combined-pdf.mjs?v=16';
import {copyLink} from './copy-data.mjs?v=16';
import {oracleTSV,mileageTSV,ready} from './model.mjs?v=13';
import {safeName} from './pack.mjs?v=13';
export async function emailPack(group,items,getFile,render=combinedPDF,base=globalThis.document?.baseURI){
 const receipts=items.filter(i=>!i.mileage),mileage=items.filter(i=>i.mileage);
 const data={v:1,expenses:receipts.length&&receipts.every(ready)?oracleTSV(items):'',mileage:mileage.length&&mileage.every(ready)?mileageTSV(mileage):''};
 const url=data.expenses||data.mileage?await copyLink(base,data):'';
 const pdf=await render(group,items,getFile,url),file=new File([pdf],safeName(group.name)+'-expenses.pdf',{type:'application/pdf'});
 return {files:[file],copyURL:url,text:group.name+' — expense summary and receipts.'+(url?'\n\nOpen this link on your work computer to copy the Oracle text:\n'+url:'\n\nDraft pack: complete and check its items before copying to Oracle.')};
}
