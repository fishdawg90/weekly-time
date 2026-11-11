// Invoke sharing directly from the tap, without rebuilding the ZIP or awaiting storage.
export async function sharePack(file,nav=globalThis.navigator){
 if(!file)return 'missing';
 try{
  if(!nav?.share||!nav.canShare?.({files:[file]}))return 'download';
  // File-only sharing avoids targets that mishandle a file combined with text.
  await nav.share({files:[file]});return 'shared';
 }catch(error){return error?.name==='AbortError'?'cancelled':'download';}
}
