#!/usr/bin/env node
/** Checks the very files GitHub Pages will publish, not just index.html. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=(message)=>{console.error('DEPLOY PREFLIGHT FAIL:',message);process.exitCode=1;};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const assets=[...html.matchAll(/\b(?:href|src)="(\.?\/?(?:styles|js|assets)\/[^"?#]+)(?:\?[^"#]*)?"/g)].map(m=>m[1]);
assets.push('data/receipts.json','js/scanners/qr-worker.js');
for(const rel of assets){
 const file=path.join(root,rel);
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())fail(`Missing: ${rel}`);
}
let count=0;
for(const dir of ['js']){
 const stack=[path.join(root,dir)];
 while(stack.length){
  const entry=stack.pop();
  for(const item of fs.readdirSync(entry,{withFileTypes:true})){
   const file=path.join(entry,item.name);
   if(item.isDirectory()){stack.push(file);continue;}
   if(!file.endsWith('.js'))continue;
   const content=fs.readFileSync(file,'utf8');
   for(const m of content.matchAll(/\b(?:import|export)\s+(?:[^\n]*?\s+from\s+)?['"](\.[^'"]+)['"]/g)){
    const ref=path.resolve(path.dirname(file),m[1].split('?')[0]);
    if(!fs.existsSync(ref))fail(`${path.relative(root,file)} imports missing ${m[1]}`);
   }
   try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'});}
   catch(e){fail(`Syntax invalid: ${path.relative(root,file)} ${String(e.stderr||e.message).slice(0,120)}`);}
   count++;
  }
 }
}
if(!html.includes("location.hostname.toLowerCase() === 'iris0324.github.io'"))fail('GitHub Pages root fix missing');
if(!html.includes('window.__foodwiseShowStartupFailure'))fail('No user-visible startup error fallback');
if(!html.includes('js/main.js?v=13.4'))fail('Expected v13.4 entry script');
if(!fs.readFileSync(path.join(root,'js/main.js'),'utf8').includes('window.__foodwiseReady=true;checkPhoneReminders()'))fail('App does not report successful startup');
if(process.argv.includes('--require-vendor')){
 const vendor=path.join(root,'js/vendor/jsQR.js');
 if(!fs.existsSync(vendor)||fs.statSync(vendor).size<100000)fail('Published jsQR decoder is missing or incomplete');
 else {
  try{execFileSync(process.execPath,['--check',vendor],{stdio:'pipe'});}catch{fail('jsQR decoder is not valid JavaScript');}
 }
 const license=path.join(root,'js/vendor/jsQR.LICENSE.txt');
 if(!fs.existsSync(license))fail('jsQR license missing');
}
if(process.exitCode)process.exit(process.exitCode);
console.log(`FoodWise Pages preflight passed: ${assets.length} static assets + ${count} JS source files`);
