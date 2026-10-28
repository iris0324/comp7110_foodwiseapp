import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const main=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/deploy-pages.yml'),'utf8');
test('GitHub Pages canonical base is declared BEFORE CSS/JS references',()=>{
 const base=index.indexOf("base.href = 'https://iris0324.github.io/comp7110_foodwiseapp/'");
 const css=index.indexOf('href="styles/tokens.css');
 const js=index.indexOf('src="js/main.js');
 assert.ok(base>0&&base<css&&css<js);
});
test('Every failed startup displays an actionable message rather than a blank HTML line',()=>{
 assert.match(index,/__foodwiseShowStartupFailure/);
 assert.match(index,/window\.addEventListener\('load'/);
 assert.match(index,/Some app files did not load/);
 assert.match(index,/href=\\?"https:\/\/iris0324\.github\.io\/comp7110_foodwiseapp\//);
 assert.match(index,/fw-startup-failure/);
});
test('Boot reports ready after successful Welcome render; never deletes test or user data',()=>{
 assert.match(main,/render\(\);window\.__foodwiseReady=true;checkPhoneReminders\(\)/);
 assert.doesNotMatch(main,/deleteDatabase|localStorage\.clear\(|sessionStorage\.clear\(/);
});
test('Deployment actually bundles jsQR, preflights files and probes public assets',()=>{
 assert.match(workflow,/Bundle QR decoder for iPhone and Android/);
 assert.match(workflow,/front\/js\/vendor\/jsQR\.js/);
 assert.match(workflow,/v13-4-deployment-preflight\.mjs --require-vendor/);
 assert.match(workflow,/Verify public FoodWise Pages files/);
});
test('Photo capture code and QR-to-catalog workflow are preserved',()=>{
 assert.match(main,/async function chooseImage\(file\)/);
 assert.match(main,/const codes=await decodeQRPhoto\(file\)/);
 assert.match(main,/codes\.map\(code=>catalog\.receipt\(code\)\)/);
 assert.match(main,/async function chooseProductImage\(file\)/);
});
