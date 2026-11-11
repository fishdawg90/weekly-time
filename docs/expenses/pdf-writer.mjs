// Small PDF container for locally rendered pages. JPEG streams stay binary; links are real PDF annotations.
const encoder=new TextEncoder(),ascii=s=>encoder.encode(s),literal=s=>String(s).replace(/[\\()]/g,'\\$&').replace(/[\r\n]/g,'');
export function imagePDF(pages){
 const objects=[null,null,null],pageIds=[];
 const add=value=>(objects.push(value),objects.length-1);
 for(const page of pages){
  const image=add([ascii(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),page.bytes,ascii('\nendstream')]);
  const commands=ascii('q 595.28 0 0 841.89 0 0 cm /Scan Do Q'),content=add([ascii(`<< /Length ${commands.length} >>\nstream\n`),commands,ascii('\nendstream')]);
  const annotations=(page.links||[]).map(link=>{const [x,y,w,h]=link.rect,scaleX=595.28/page.width,scaleY=841.89/page.height;return add(ascii(`<< /Type /Annot /Subtype /Link /Rect [${x*scaleX} ${(page.height-y-h)*scaleY} ${(x+w)*scaleX} ${(page.height-y)*scaleY}] /Border [0 0 0] /A << /S /URI /URI (${literal(link.url)}) >> >>`));});
  pageIds.push(add(ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Scan ${image} 0 R >> >> /Contents ${content} 0 R /Annots [${annotations.map(n=>n+' 0 R').join(' ')}] >>`)));
 }
 objects[1]=ascii('<< /Type /Catalog /Pages 2 0 R >>');objects[2]=ascii(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(n=>n+' 0 R').join(' ')}] >>`);
 const parts=[ascii('%PDF-1.4\n%local-scans\n')],offsets=[0];let size=parts[0].length;
 for(let n=1;n<objects.length;n++){offsets[n]=size;const body=Array.isArray(objects[n])?objects[n]:[objects[n]],chunks=[ascii(`${n} 0 obj\n`),...body,ascii('\nendobj\n')];parts.push(...chunks);size+=chunks.reduce((s,c)=>s+c.length,0);}
 const xref=size;parts.push(ascii(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));return new Blob(parts,{type:'application/pdf'});
}
