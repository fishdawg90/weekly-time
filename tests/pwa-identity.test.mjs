import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('Weekly keeps its installed identity and Expenses has a separate identity',async()=>{
 const weekly=JSON.parse(await readFile(new URL('../docs/manifest.webmanifest',import.meta.url),'utf8'));
 const expenses=JSON.parse(await readFile(new URL('../docs/expenses/manifest.webmanifest',import.meta.url),'utf8'));
 const origin='https://fishdawg90.github.io';
 const resolve=(m,path)=>new URL(m.id,new URL(m.start_url,origin+path).origin).href;
 assert.equal(resolve(weekly,'/weekly-time/manifest.webmanifest'),origin+'/');
 assert.equal(resolve(expenses,'/weekly-time/expenses/manifest.webmanifest'),origin+'/weekly-time/expenses/');
 assert.notEqual(resolve(weekly,'/weekly-time/manifest.webmanifest'),resolve(expenses,'/weekly-time/expenses/manifest.webmanifest'));
});
