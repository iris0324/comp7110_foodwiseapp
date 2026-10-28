import './vendor.mjs';
import {build} from 'esbuild';
import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
const url=process.env.SUPABASE_URL||'', key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
if(key.startsWith('sb_secret_'))throw Error('Secret key is forbidden');
if(key.startsWith('eyJ')){const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));if(claims.role!=='anon')throw Error('Only anon JWT keys are permitted');}
if(Boolean(url)!==Boolean(key))throw Error('Both Supabase URL and public key are required');
if(process.env.CI&&(!url||!key))throw Error('Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY repository variables');
if(url&&!/^https:\/\/[^/]+\.supabase\.co$/.test(url))throw Error('Invalid Supabase project URL');
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const path of ['index.html','styles','assets','data','js'])await cp(path,`dist/${path}`,{recursive:true});
await build({entryPoints:['js/main.js'],outfile:'dist/js/main.js',bundle:true,format:'esm',platform:'browser',target:'es2022',plugins:[{name:'public-config',setup(b){b.onLoad({filter:/supabase-config\.js$/},()=>({contents:`export const SUPABASE_URL=${JSON.stringify(url)};export const SUPABASE_PUBLISHABLE_KEY=${JSON.stringify(key)};`,loader:'js'}));}}]});
await writeFile('dist/.nojekyll','');
console.log(`Built Pages artifact in dist (${url?'Supabase configured':'unconfigured: guest only'})`);
