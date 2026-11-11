// Invoke sharing directly from the tap, without rebuilding the pack or awaiting storage.
export async function sharePack(input,nav=globalThis.navigator){
 const files=(Array.isArray(input)?input:[input]).filter(Boolean);if(!files.length)return 'missing';
 try{
  if(!nav?.share||!nav.canShare?.({files}))return 'download';
  // File-only sharing avoids targets that mishandle a file combined with text.
  await nav.share({files});return 'shared';
 }catch(error){return error?.name==='AbortError'?'cancelled':'download';}
}
