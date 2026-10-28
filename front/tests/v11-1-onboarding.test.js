import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {entryPage, initialPage, ONBOARDING_KEY, PUBLIC_ENTRY_PAGES} from '../js/app/onboarding.js';
import {authScreen} from '../js/ui/screens/auth.js';
import {setLanguage} from '../js/i18n/index.js?v=13.0';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const main=readFileSync(resolve(root,'js/main.js'),'utf8');

test('all new users and old v9 guests see Welcome regardless of persisted content',()=>{
 assert.equal(entryPage('home',null),'welcome');
 assert.equal(entryPage('food',null),'welcome');
 assert.equal(entryPage('story',null),'welcome');
 assert.equal(entryPage('home','old-v9-guest'),'welcome');
 assert.equal(entryPage('home',false),'welcome');
 assert.equal(entryPage('food',false),'welcome');
 assert.equal(entryPage('home',true),'home');
 assert.equal(entryPage('food',true),'food');
 assert.equal(initialPage(),'welcome');
});
test('all auth routes remain available without a guest session',()=>{
 for(const page of PUBLIC_ENTRY_PAGES)assert.equal(entryPage(page,null),page);
});
test('every browser document begins at Welcome regardless of prior guest status or URL hash',()=>{
 assert.match(main,/guestEnteredThisLaunch=false/);
 assert.match(main,/current=\{page:initialPage\(\),id:''\}/);
 assert.match(main,/history\.replaceState\(null,'',path\(initialPage\(\)\)\)/);
 assert.match(main,/entryPage\(page,guestEnteredThisLaunch\)/);
 assert.match(main,/entryPage\(next\.page,guestEnteredThisLaunch\)/);
 assert.doesNotMatch(main,/localStorage\.setItem\(ONBOARDING_KEY,'guest'\)/);
 assert.match(main,/if\(name==='enter-guest'\)\{guestEnteredThisLaunch=true/);
 assert.match(main,/if\(name==='exit-guest'\)\{guestEnteredThisLaunch=false/);
 assert.ok(main.includes('data-action="exit-guest"'));
 assert.equal(ONBOARDING_KEY,'fw-onboarding-v11-1');
});
test('Welcome includes all three entrances in both languages',()=>{
 setLanguage('en');let html=authScreen('welcome');
 for(const s of ['Welcome to FoodWise','Create Account','Log In','Continue as Guest'])assert.ok(html.includes(s),s);
 setLanguage('zh');html=authScreen('welcome');
 for(const s of ['歡迎來到 FoodWise','建立帳號','登入','以訪客身份繼續'])assert.ok(html.includes(s),s);
});
test('project contains explicit corrected VS Code start guide',()=>{
 assert.ok(existsSync(resolve(root,'START_HERE_V11_1.md')));
});
