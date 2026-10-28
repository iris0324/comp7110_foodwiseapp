import {readFile,stat} from 'node:fs/promises';
const html=await readFile('dist/index.html','utf8');
const paths=[...html.matchAll(/(?:src|href)="((?:styles|assets|js)\/[^"?]+)(?:\?[^\"]*)?"/g)].map(m=>m[1]);
paths.push('js/vendor/jsQR.js','js/vendor/jsQR.LICENSE.txt','data/products.json','data/receipts.json');
for(const p of paths)if(!(await stat('dist/'+p)).isFile())throw Error('Missing '+p);
const js=await readFile('dist/js/main.js','utf8');
if(/^import\b[^\n]*from ["']@supabase/m.test(js))throw Error('SDK was not bundled');
console.log(`Pages artifact: ${paths.length} referenced files present; SDK bundled`);
