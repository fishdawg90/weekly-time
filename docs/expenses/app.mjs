import {pdfViewer} from './pdf-viewer.mjs?v=3';
import {inAppBack,backTarget} from './navigation.mjs?v=3';
import {empty,uid,newItem,active,ready,missing,sums,merge,validate,oracleTSV,moveItems} from './model.mjs?v=3';
import {load,write,file,db} from './db.mjs?v=3';
import {zip,report,safeName,blobBase64,dataBlob} from './pack.mjs?v=3';
import {imageEditor} from './editor.mjs?v=9';
import {swipeExpense} from './swipe.mjs?v=5';
import {bookmarkURL} from './oracle-bookmark.mjs?v=3';
const $=id=>document.getElementById(id),el=(t,c,text)=>{const e=document.createElement(t);if(c)e.className=c;if(text!==undefined)e.textContent=text;return e;};
let state,groupId=null,itemId=null,filter='active',renameId=null,groupContext=null,zoom=1,urls=[],viewerURL=null,toastTimer,saveTimer,dirty=false,serial=Promise.resolve(),packURL=null,packFile=null,installEvent;
const money=(c,n)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:c}).format(n);
const amounts=items=>Object.entries(sums(items)).map(([c,n])=>money(c,n)).join(' · ');
const itemsFor=id=>active(state).filter(i=>i.groupId===id).sort((a,b)=>a.created-b.created);
const currentItem=()=>state.items.find(i=>i.id===itemId);
function toast(s,undo){clearTimeout(toastTimer);const t=$('toast');t.replaceChildren(document.createTextNode(s));if(undo){const b=el('button','toast-undo','Undo');b.onclick=action(async()=>{await undo();toast('Expense restored.');});t.append(b);}t.hidden=false;toastTimer=setTimeout(()=>t.hidden=true,undo?9000:4500);}
function fail(e){console.error(e);toast(e.message||String(e));$('save-state').textContent='Could not save — please export a backup';}
function persist(files=[]){serial=serial.catch(()=>{}).then(async()=>{await write(state,files);$('save-state').textContent='Saved';setTimeout(()=>{$('save-state').textContent='';},1800);});return serial;}
function action(fn){return async e=>{try{await fn(e);}catch(err){fail(err);}};}
const dialogOrder=[];
const backNav=inAppBack({hasContent:()=>!!groupId||document.querySelector('dialog[open]'),onError:fail,back:async()=>{
 const open=dialogOrder.filter(id=>$(id).open);for(const d of document.querySelectorAll('dialog[open]'))if(!open.includes(d.id))open.push(d.id);
 const target=backTarget(open,groupId);if(target.kind==='dialog'){if(target.id==='item-dialog')await closeItem();else $(target.id).close();}else if(target.kind==='group')home();
}});
for(const d of document.querySelectorAll('dialog'))new MutationObserver(()=>{const index=dialogOrder.indexOf(d.id);if(index>=0)dialogOrder.splice(index,1);if(d.open){dialogOrder.push(d.id);backNav.arm();}}).observe(d,{attributes:true,attributeFilter:['open']});
function dialog(id){$(id).showModal();backNav.arm();}
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
function revokeCards(){urls.forEach(URL.revokeObjectURL);urls=[];}
async function thumbnail(id,target){const f=await file(id);if(!f||!target.isConnected)return;if(f.original.type.startsWith('image/')){const url=URL.createObjectURL(f.edited||f.original);urls.push(url);const img=el('img','thumb');img.alt='Receipt';img.src=url;target.replaceWith(img);}else target.textContent='PDF';}
function drawHome(){
 revokeCards();
 const groups=state.groups.filter(g=>g.id!=='inbox'||itemsFor(g.id).length),target=$('groups');target.replaceChildren();let shown=0;
 for(const g of groups){
  const items=itemsFor(g.id),done=items.filter(ready).length,isReady=items.length>0&&done===items.length;
  if(filter==='active'&&g.claimed||filter==='ready'&&(g.claimed||!isReady)||filter==='claimed'&&!g.claimed)continue;
  shown++;
  const row=el('button','group-row'),info=el('div','group-info'),line=el('div','group-line'),meta=el('div','group-meta');
  line.append(el('b','',g.name),el('span','group-total',amounts(items)||'—'));
  meta.append(el('span','',items.length+' expense'+(items.length===1?'':'s')),el('span','',g.claimed?'Claimed':isReady?'Ready':items.length?items.length-done+' to complete':''));
  info.append(line,meta);row.append(info,el('span','group-chevron','›'));row.onclick=()=>showGroup(g.id);target.append(row);
 }
 $('group-count').textContent=shown||'';
 if(!shown){const box=el('div','empty');box.append(el('h3','',filter==='ready'?'No groups ready':filter==='claimed'?'No claimed groups':'No groups yet'),el('p','',filter==='active'?'Create a group or add an expense.':'Choose another filter to see your groups.'));target.append(box);}
}
function drawGroup(){
 const g=state.groups.find(g=>g.id===groupId);if(!g)return home();revokeCards();
 const items=itemsFor(groupId),done=items.filter(ready).length;
 $('group-title').textContent=g.name;
 $('group-progress').textContent=items.length+' expense'+(items.length===1?'':'s')+' · '+done+' ready'+(amounts(items)?' · '+amounts(items):'')+(g.claimed?' · Claimed':'');
 $('complete-group').disabled=!items.some(i=>!ready(i));
 $('pack-group').disabled=$('move-group').disabled=!items.length;
 $('claim-group').textContent=g.claimed?'Reopen group':'Mark claimed';
 $('claim-group').disabled=!g.claimed&&(!items.length||!items.every(ready));
 $('rename-group').hidden=groupId==='inbox';
 const list=$('items');list.replaceChildren();
 for(const i of items){
  const b=el('button','expense-row'),thumb=el('span','thumb',i.text?'≡':'▤'),info=el('div','row-info'),value=el('div','row-amount');
  info.append(el('b','',i.description||'Untitled expense'),el('small','',[i.date||'No date',i.reference||'No reference'].join(' · ')));
  value.append(el('b','',Number(i.amount)>0?money(i.currency||'GBP',Number(i.amount)):'—'),el('small','',ready(i)?'Ready':missing(i).length?missing(i).length+' missing':'Review'));
  b.append(thumb,info,value);
  const row=el('div','expense-swipe'),del=el('button','expense-delete','Delete');del.setAttribute('aria-label','Delete '+(i.description||'expense'));
  row.append(b,del);swipeExpense(row,del,action(()=>openItem(i.id)),action(()=>deleteExpense(i)));list.append(row);
  if(i.attachments[0])thumbnail(i.attachments[0],thumb).catch(fail);
 }
 if(!items.length){const box=el('div','empty');box.append(el('h3','','No expenses'),el('p','','Add a receipt or enter one manually.'));list.append(box);}
}
function home(){groupId=null;$('home').hidden=false;$('group-view').hidden=true;drawHome();scrollTo(0,0);}
function showGroup(id){groupId=id;backNav.arm();$('home').hidden=true;$('group-view').hidden=false;drawGroup();scrollTo(0,0);}
function redraw(){if(groupId)drawGroup();else drawHome();}
function fillGroups(select,id){select.replaceChildren(...state.groups.filter(g=>!g.claimed||g.id===id).map(g=>new Option(g.name,g.id)));select.value=id||'inbox';}
function capture(){fillGroups($('capture-group-select'),groupId||'inbox');dialog('capture-dialog');}
$('capture-home').onclick=$('capture-group').onclick=()=>capture();$('back-home').onclick=home;
$('group-filter').onchange=()=>{filter=$('group-filter').value;drawHome();};
$('group-more').onclick=()=>dialog('group-actions-dialog');
$('group-actions-dialog').addEventListener('click',e=>{if(e.target.closest('[data-group-action]'))$('group-actions-dialog').close();},true);
document.querySelector('.brand').onclick=e=>{e.preventDefault();home();};
function groupDialog(id=null,context=null){renameId=id;groupContext=context;$('group-dialog-title').textContent=id?'Rename group':'New group';$('group-name').value=id?state.groups.find(g=>g.id===id).name:'';dialog('group-dialog');$('group-name').focus();}
$('new-group').onclick=()=>groupDialog();$('rename-group').onclick=()=>groupDialog(groupId);
$('group-form').onsubmit=action(async e=>{e.preventDefault();const name=$('group-name').value.trim();if(!name)return;let id=renameId;if(id)state.groups.find(g=>g.id===id).name=name;else{ id=uid();state.groups.push({id,name,claimed:false,created:Date.now()});}await persist();$('group-dialog').close();if(groupContext==='item'){$('item-group').add(new Option(name,id));$('item-group').value=id;formData();await persist();requirements();toast('Moved to '+name+'.');}else showGroup(id);groupContext=null;});
$('camera-btn').onclick=()=>$('camera').click();$('photos-btn').onclick=()=>$('photos').click();$('files-btn').onclick=()=>$('files').click();
async function ingest(files,group,attach=false){const accepted=Array.from(files).filter(f=>f.type.startsWith('image/')||f.type==='application/pdf'||/\.pdf$/i.test(f.name));if(accepted.length!==files.length)toast('Only images and PDFs can be added.');if(accepted.some(f=>f.size>40*1024*1024))throw Error('Choose files smaller than 40 MB each.');if(!accepted.length)return;const writes=[],added=[];for(const f of accepted){const record={id:uid(),name:f.name||'receipt.jpg',original:f};writes.push(record);if(attach)currentItem().attachments.push(record.id);else{const i=newItem(group,record.id);state.items.push(i);added.push(i);}}if(attach){currentItem().reviewed=false;state.groups.find(g=>g.id===currentItem().groupId).claimed=false;}else state.groups.find(g=>g.id===group).claimed=false;await persist(writes);redraw();if($('capture-dialog').open)$('capture-dialog').close();if(!attach)await openItem(added[0].id);else await renderEvidence();if(accepted.length===1&&accepted[0].type.startsWith('image/'))await editImage(writes[0]);else toast(`${accepted.length} file${accepted.length>1?'s':''} saved. Details can wait.`);}
for(const id of ['camera','photos','files'])$(id).onchange=action(async e=>{await ingest(e.target.files,$('capture-group-select').value);e.target.value='';});
$('text-btn').onclick=action(async()=>{const i=newItem($('capture-group-select').value);state.items.push(i);await persist();$('capture-dialog').close();redraw();await openItem(i.id);});
function formData(){const i=currentItem();if(!i)return;const form=$('item-form'),previousGroup=i.groupId;let changed=false;
 for(const k of ['date','amount','currency','reference','description','text']){let value=form.elements[k].value.trim();if(k==='currency')value=value.toUpperCase();if(String(i[k]??'')!==value)changed=true;i[k]=value;}
 if(i.noReceipt!==form.elements.noReceipt.checked)changed=true;i.noReceipt=form.elements.noReceipt.checked;i.groupId=form.elements.groupId.value;
 if(changed)i.reviewed=false;if(changed||previousGroup!==i.groupId){const g=state.groups.find(g=>g.id===i.groupId);if(g)g.claimed=false;const old=state.groups.find(g=>g.id===previousGroup);if(old&&previousGroup!==i.groupId)old.claimed=false;}
}
function requirements(){const i=currentItem();if(!i)return;const m=missing(i);$('item-missing').textContent=m.length?'Draft · missing '+m.join(', '):ready(i)?'Ready to claim':'Check the receipt, then mark done.';$('item-missing').classList.toggle('complete',!m.length);}
async function flush(){clearTimeout(saveTimer);if(dirty){formData();dirty=false;await persist();}await serial;}
$('item-form').oninput=()=>{dirty=true;formData();requirements();clearTimeout(saveTimer);saveTimer=setTimeout(()=>flush().catch(fail),600);};
async function openItem(id){if($('item-dialog').open)await flush();itemId=id;dirty=false;const i=currentItem();$('item-title').textContent=i.description||'Expense';const is=itemsFor(i.groupId);$('item-counter').textContent=`${state.groups.find(g=>g.id===i.groupId).name} · ${is.indexOf(i)+1} / ${is.length}`;const form=$('item-form');fillGroups($('item-group'),i.groupId);$('reference-select').replaceChildren(new Option('Choose…',''),...state.categories.map(c=>new Option(c,c)));if(i.reference&&!state.categories.includes(i.reference))$('reference-select').add(new Option(i.reference,i.reference));for(const k of ['date','amount','currency','reference','description','text','groupId'])form.elements[k].value=i[k]||'';form.elements.noReceipt.checked=!!i.noReceipt;$('item-extras').open=false;for(const d of document.querySelectorAll('.receipt-options'))d.open=false;requirements();if(!$('item-dialog').open)dialog('item-dialog');await renderEvidence();}
async function closeItem(){await flush();pdf.close();$('item-dialog').close();redraw();}
$('new-item-group').onclick=action(async()=>{await flush();groupDialog(null,'item');});
$('close-item').onclick=action(closeItem);$('item-dialog').addEventListener('cancel',e=>{e.preventDefault();closeItem().catch(fail);});
$('item-form').onsubmit=action(async e=>{
 e.preventDefault();const button=$('finish-item');if(button.disabled)return;button.disabled=true;
 try{
  await flush();formData();const i=currentItem(),absent=missing(i);i.reviewed=absent.length===0;
  await persist();await closeItem();showGroup(i.groupId);
  toast(absent.length?'Draft saved · missing '+absent.join(', '):itemsFor(i.groupId).every(ready)?'Group ready to claim.':'Expense saved.');
 }catch(error){$('item-missing').textContent='Could not save. Please try again.';throw error;}
 finally{button.disabled=false;}
});
$('complete-group').onclick=action(async()=>{const i=itemsFor(groupId).find(i=>!ready(i));if(i)await openItem(i.id);});
async function deleteExpense(i){await flush();const reviewed=i.reviewed;i.deleted=true;i.reviewed=false;state.groups.find(g=>g.id===i.groupId).claimed=false;await persist();if(itemId===i.id&&$('item-dialog').open){pdf.close();$('item-dialog').close();}redraw();toast('Expense deleted.',async()=>{i.deleted=false;i.reviewed=reviewed;await persist();redraw();});}
$('remove-item').onclick=action(()=>deleteExpense(currentItem()));
$('add-reference').onclick=action(async()=>{const name=prompt('Exact reference / expense type shown in Oracle:');if(!name?.trim())return;await flush();const v=name.trim().slice(0,200);if(!state.categories.includes(v))state.categories.push(v);$('reference-select').add(new Option(v,v));$('reference-select').value=v;formData();await persist();requirements();});
$('attach-btn').onclick=()=>$('attach').click();$('attach').onchange=action(async e=>{await flush();await ingest(e.target.files,currentItem().groupId,true);requirements();e.target.value='';});
let evidenceRecords=[];const pdf=pdfViewer($('viewer'));let viewGeneration=0;
async function renderEvidence(){if(viewerURL)URL.revokeObjectURL(viewerURL);const i=currentItem();evidenceRecords=(await Promise.all(i.attachments.map(file))).filter(Boolean);$('evidence-select').replaceChildren(...evidenceRecords.map((f,n)=>new Option(`${n+1}. ${f.name}`,f.id)));if(i.text)$('evidence-select').add(new Option('Email / SMS text','text'));if(!$('evidence-select').options.length)$('evidence-select').add(new Option('No evidence attached','none'));await viewEvidence();}
async function viewEvidence(){const token=++viewGeneration;pdf.close();$('viewer').classList.remove('pdf-viewer');if(viewerURL)URL.revokeObjectURL(viewerURL);const id=$('evidence-select').value,f=evidenceRecords.find(f=>f.id===id),v=$('viewer');v.replaceChildren();zoom=1;$('edit-image').hidden=!f?.original.type.startsWith('image/');$('evidence-select').hidden=$('evidence-select').options.length<2;document.querySelector('.viewer-tools').hidden=$('edit-image').hidden&&$('evidence-select').hidden;v.hidden=!f&&id!=='text';$('download-evidence').hidden=!f;$('open-evidence').hidden=!f||f.original.type.startsWith('image/');$('zoom-in').hidden=$('zoom-out').hidden=!f?.original.type.startsWith('image/');if(f){viewerURL=URL.createObjectURL(f.edited||f.original);$('download-evidence').href=URL.createObjectURL(f.original);urls.push($('download-evidence').href);$('download-evidence').download=f.name;$('open-evidence').href=$('download-evidence').href;if(f.original.type.startsWith('image/')){const img=el('img');img.src=viewerURL;img.alt='Receipt evidence';v.append(img);}else{await pdf.open(f.original);if(token!==viewGeneration)return;}}else if(id==='text'){v.append(el('pre','',currentItem().text));}else{const x=el('div','empty');x.append(el('p','','No receipt attached.'));v.append(x);}}
$('evidence-select').onchange=action(viewEvidence);$('zoom-in').onclick=()=>{zoom=Math.min(4,zoom+.25);const img=$('viewer').querySelector('img');if(img)img.style.width=zoom*100+'%';};$('zoom-out').onclick=()=>{zoom=Math.max(.5,zoom-.25);const img=$('viewer').querySelector('img');if(img)img.style.width=zoom*100+'%';};
const editImage=imageEditor({dialog:$('image-dialog'),canvas:$('crop-canvas'),onError:fail,onSave:async(record,blob)=>{record.edited=blob;await flush();await persist([record]);await renderEvidence();toast('Scan saved.');}});
$('edit-image').onclick=action(async()=>{await flush();const f=evidenceRecords.find(f=>f.id===$('evidence-select').value);if(f)await editImage(f);});
$('move-group').onclick=()=>{const is=itemsFor(groupId);$('move-list').replaceChildren();for(const i of is){const label=el('label','check'),c=el('input');c.type='checkbox';c.value=i.id;c.checked=true;label.append(c,el('span','',i.description||i.date||'Receipt waiting for details'));$('move-list').append(label);}fillGroups($('move-target'),groupId==='inbox'?state.groups.find(g=>g.id!=='inbox'&&!g.claimed)?.id||'inbox':'inbox');$('move-all').checked=true;$('move-name').value='';$('move-name-label').hidden=true;$('move-target').disabled=false;dialog('move-dialog');};
$('move-all').onchange=()=>{$('move-list').querySelectorAll('input').forEach(c=>c.checked=$('move-all').checked);};
$('move-new').onclick=()=>{$('move-name-label').hidden=!$('move-name-label').hidden;$('move-target').disabled=!$('move-name-label').hidden;if(!$('move-name-label').hidden)$('move-name').focus();};
$('confirm-move').onclick=action(async()=>{const ids=[...$('move-list').querySelectorAll('input:checked')].map(c=>c.value);if(!ids.length){toast('Select at least one expense.');return;}let target=$('move-target').value;if(!$('move-name-label').hidden){const name=$('move-name').value.trim();if(!name){toast('Enter a name for the new group.');return;}target=uid();state.groups.push({id:target,name,claimed:false,created:Date.now()});}const count=moveItems(state,ids,target);await persist();$('move-dialog').close();showGroup(target);toast(`${count} expense${count===1?'':'s'} moved. Receipt details kept.`);});
$('claim-group').onclick=action(async()=>{const g=state.groups.find(g=>g.id===groupId);g.claimed=!g.claimed;await persist();redraw();toast(g.claimed?'✓ Claim filed away. A little less admin.':'Group reopened.');});
async function backupData(items=state.items,groups=state.groups){await flush();const refs=[...new Set(items.flatMap(i=>i.attachments))],files=[];for(const id of refs){const f=await file(id);if(!f)throw Error('An attachment is missing. Please export other groups and check this expense.');files.push({id:f.id,name:f.name,original:await blobBase64(f.original),edited:f.edited?await blobBase64(f.edited):null});}return {format:'weekly-expenses-backup',version:1,exported:new Date().toISOString(),state:{...state,groups,items},files};}
function download(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('settings').onclick=action(async()=>{const t=$('trash');t.replaceChildren();for(const i of state.items.filter(i=>i.deleted)){const row=el('div','trash-row'),b=el('button','text-btn','Restore');row.append(el('span','',i.description||'Receipt without details'),b);b.onclick=action(async()=>{i.deleted=false;await persist();row.remove();redraw();toast('Expense restored.');});t.append(row);}if(!t.children.length)t.append(el('p','small muted','Nothing in deleted items.'));if(navigator.storage?.estimate){const s=await navigator.storage.estimate();$('storage-info').textContent=`About ${((s.usage||0)/1024/1024).toFixed(1)} MB stored on this device.`;}dialog('settings-dialog');});
$('persist').onclick=action(async()=>{const ok=await navigator.storage?.persist?.();toast(ok?'Storage protection enabled. Keep backups as well.':'Your browser manages storage protection. Keep a backup of your receipts.');});
$('backup').onclick=action(async()=>{toast('Preparing backup with all original evidence…');const data=await backupData();download(new Blob([JSON.stringify(data)],{type:'application/json'}),'Expenses-backup-'+new Date().toISOString().slice(0,10)+'.json');});
$('restore-btn').onclick=()=>$('restore').click();$('restore').onchange=action(async e=>{const f=e.target.files[0];if(!f)return;if(f.size>250*1024*1024)throw Error('Import a backup smaller than 250 MB. Export individual groups instead.');const b=JSON.parse(await f.text());if(b.format!=='weekly-expenses-backup'||b.version!==1||!Array.isArray(b.files))throw Error('Choose a full backup JSON or restore.json extracted from a pack.');validate(b.state);const records=[],ids=new Set();for(const x of b.files){if(!x||typeof x.id!=='string'||typeof x.name!=='string'||ids.has(x.id))throw Error('Invalid backup attachments.');ids.add(x.id);if(!await file(x.id))records.push({id:x.id,name:x.name,original:dataBlob(x.original),edited:x.edited?dataBlob(x.edited):undefined});}for(const i of b.state.items)for(const id of i.attachments)if(!ids.has(id))throw Error('Backup is missing an attachment.');const before=state.items.length;state=merge(state,b.state);await persist(records);$('settings-dialog').close();home();toast(`${state.items.length-before} expenses imported. Existing items kept.`);e.target.value='';});
$('pack-group').onclick=()=>{if(packURL)URL.revokeObjectURL(packURL);packURL=null;packFile=null;const g=state.groups.find(g=>g.id===groupId),is=itemsFor(groupId);$('pack-summary').textContent=`${g.name} · ${is.length} expense${is.length===1?'':'s'} · ${amounts(is)||'No amounts'} · ${is.filter(ready).length} ready`;$('oracle-text').value=is.every(ready)?oracleTSV(is):'';$('oracle-text').placeholder='Finish and check all items to enable the Oracle table. You can export the evidence pack at any time.';$('copy-oracle').disabled=!is.every(ready);$('build-pack').hidden=false;$('share-pack').hidden=$('download-pack').hidden=true;$('pack-status').textContent='';dialog('pack-dialog');};
$('build-pack').onclick=action(async()=>{const b=$('build-pack');b.disabled=true;try{$('pack-status').textContent='Gathering receipts and building your pack…';const g=state.groups.find(g=>g.id===groupId),is=itemsFor(groupId),evidence={},entries=[];for(let n=0;n<is.length;n++){const i=is[n];evidence[i.id]=[];for(let a=0;a<i.attachments.length;a++){const f=await file(i.attachments[a]);if(!f)throw Error('Missing attachment for expense '+(n+1));const prefix=String(n+1).padStart(3,'0')+'-'+(a+1),name=prefix+'-'+safeName(f.name);const path='evidence/'+name;entries.push({name:path,blob:f.original});evidence[i.id].push({path,label:'Original '+(a+1)});if(f.edited){const ep='evidence/'+prefix+'-enhanced.jpg';entries.push({name:ep,blob:f.edited});evidence[i.id].push({path:ep,label:'Enhanced '+(a+1)});}}}const portable=await backupData(is,state.groups.filter(x=>x.id==='inbox'||x.id===groupId));entries.push({name:'summary.html',text:report(g,is,evidence)},{name:'summary.tsv',text:oracleTSV(is)},{name:'oracle.txt',text:is.every(ready)?oracleTSV(is):'This group is incomplete. Import restore.json into Expenses, complete and check each item, then copy the Oracle table.'},{name:'restore.json',text:JSON.stringify(portable)});const blob=await zip(entries);packFile=new File([blob],safeName(g.name)+'-expenses.zip',{type:'application/zip'});packURL=URL.createObjectURL(blob);$('download-pack').href=packURL;$('download-pack').download=packFile.name;$('download-pack').hidden=false;$('share-pack').hidden=!navigator.canShare?.({files:[packFile]});$('pack-status').textContent=`Pack ready · ${(blob.size/1024/1024).toFixed(1)} MB. ${$('share-pack').hidden?'Download it and attach it to an email.':'Share it to your email app, choose your work address and send.'} Larger packs may exceed your email’s attachment limit.`;}finally{b.disabled=false;}});
$('share-pack').onclick=action(async()=>{if(packFile)try{await navigator.share({files:[packFile],title:'Expense pack',text:state.groups.find(g=>g.id===groupId).name+' — expense summary and receipt evidence'});}catch(e){if(e.name!=='AbortError')throw e;}});
$('copy-oracle').onclick=action(async()=>{try{await navigator.clipboard.writeText($('oracle-text').value);toast('Oracle table copied.');}catch{$('oracle-text').select();toast('Select Copy to copy this table.');}});
$('expense-bookmark').href=bookmarkURL;$('expense-bookmark').onclick=e=>{e.preventDefault();toast('Drag this link to the bookmarks bar, then click the bookmark on Oracle.');};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('install').hidden=false;});$('install').onclick=action(async()=>{await installEvent?.prompt();$('install').hidden=true;});
window.addEventListener('online',()=>connection());window.addEventListener('offline',()=>connection());function connection(){$('connection').hidden=navigator.onLine;$('connection').textContent=navigator.onLine?'':'Offline';}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});document.addEventListener('visibilitychange',()=>{if(document.hidden)flush().catch(fail);});
try{state=await load();connection();home();if(new URL(location.href).searchParams.has('capture'))capture();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(fail);const shared=new URL(location.href).searchParams.get('shared');if(shared){const i=state.items.find(i=>i.id===shared);if(i)await openItem(i.id);history.replaceState({...history.state},'',location.pathname);}const d=await db();const sharedItems=await new Promise((res,rej)=>{const q=d.transaction('meta').objectStore('meta').get('shared-error');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});if(sharedItems)toast('Shared content could not be saved. Please add it directly.');}catch(e){$('groups').replaceChildren(el('div','empty','Local storage is unavailable. Enable browser storage and reload before adding receipts.'));fail(e);}
