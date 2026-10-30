export const SCHEMA=1;
export const STORE_KEY='weekly-time:data:v1';
export const uid=()=>globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(36).slice(2));
export function isoDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return !isNaN(d)&&isoDate(d)===s;}
export function monday(date=new Date()){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return isoDate(d);}
export function shiftDay(s,n){const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return isoDate(d);}
export const days=s=>Array.from({length:5},(_,i)=>shiftDay(s,i));
export function parseHours(raw){const s=String(raw).trim().replace(',','.');if(s==='')return null;if(!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(s))throw Error('Use hours from 0 to 24, with up to two decimal places.');const n=Number(s);if(!Number.isFinite(n)||n<0||n>24)throw Error('Hours must be between 0 and 24.');return n;}
export const total=values=>values.reduce((a,n)=>a+Math.round((n||0)*100),0)/100;
export const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
export const projectKey=p=>p.code.trim().toLowerCase()+'\u0000'+p.task.trim().toLowerCase();
export const emptyData=()=>({schemaVersion:SCHEMA,revision:0,projects:[],weeks:{},lastBackup:null});
export function snapshot(p){return {id:uid(),projectId:p.id,name:p.name,code:p.code,task:p.task,hours:[null,null,null,null,null]};}
export function oraclePayload(data,week){return {schemaVersion:1,weekStart:week,dates:days(week),rows:(data.weeks[week]?.rows||[]).filter(r=>r.hours.some(n=>n!==null&&n!==0)).map(r=>({projectName:r.name,projectCode:r.code,taskCode:r.task,hours:r.hours.map(n=>n??0)}))};}
const safeCell=s=>String(s).replace(/[\t\r\n]+/g,' ');
export function oracleTSV(data,week){const p=oraclePayload(data,week);return [['Project','Project code','Task',...p.dates],...p.rows.map(r=>[r.projectName,r.projectCode,r.taskCode,...r.hours])].map(r=>r.map(safeCell).join('\t')).join('\n');}
export function validateData(raw){
 const fail=m=>{throw Error('Invalid backup: '+m);};
 if(!raw||raw.schemaVersion!==SCHEMA||!Array.isArray(raw.projects)||!raw.weeks||Array.isArray(raw.weeks)||typeof raw.weeks!=='object')fail('unsupported format.');
 if(raw.projects.length>10000||Object.keys(raw.weeks).length>10000)fail('too many records.');
 const str=(v,max=300)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 const ids=new Set(),keys=new Set();const projects=raw.projects.map(p=>{
  if(!p||!str(p.id,100)||ids.has(p.id)||!str(p.name)||!str(p.code,150)||!str(p.task,150))fail('invalid or duplicate project.');
  ids.add(p.id);const key=projectKey(p);if(keys.has(key))fail('duplicate project code/task combination.');keys.add(key);
  return {id:p.id,name:p.name.trim(),code:p.code.trim(),task:p.task.trim(),archived:!!p.archived};
 });
 const weeks={};for(const [date,w]of Object.entries(raw.weeks)){
  if(!validDate(date)||monday(new Date(date+'T12:00:00'))!==date||!w||!Array.isArray(w.rows)||w.rows.length>1000)fail('invalid week.');
  const rowIds=new Set(),rowKeys=new Set();const rows=w.rows.map(r=>{
   if(!r||!str(r.id,100)||rowIds.has(r.id)||!ids.has(r.projectId)||!str(r.name)||!str(r.code,150)||!str(r.task,150)||!Array.isArray(r.hours)||r.hours.length!==5)fail('invalid row.');
   rowIds.add(r.id);const key=projectKey(r);if(rowKeys.has(key))fail('duplicate project/task in a week.');rowKeys.add(key);
   if(r.hours.some(n=>n!==null&&(typeof n!=='number'||!Number.isFinite(n)||n<0||n>24||Math.abs(n*100-Math.round(n*100))>0.000001)))fail('invalid hours.');
   return {id:r.id,projectId:r.projectId,name:r.name.trim(),code:r.code.trim(),task:r.task.trim(),hours:[...r.hours]};
  });weeks[date]={rows};
 }
 return {schemaVersion:SCHEMA,revision:Number.isSafeInteger(raw.revision)&&raw.revision>=0?raw.revision:0,projects,weeks,lastBackup:typeof raw.lastBackup==='string'&&!isNaN(Date.parse(raw.lastBackup))?raw.lastBackup:null};
}
