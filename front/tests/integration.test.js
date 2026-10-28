import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CatalogService} from '../js/services/catalog-service.js';
import {seed} from '../js/data/seed.js';
import {executeCommand} from '../js/domain/commands.js';
const products=JSON.parse(readFileSync(new URL('../data/products.json',import.meta.url),'utf8'));
const receipts=JSON.parse(readFileSync(new URL('../data/receipts.json',import.meta.url),'utf8'));
const svc=new CatalogService();svc.products=products.products;svc.receipts=receipts.receipts;
const id=()=>crypto.randomUUID();
const money=item=>Number(item.line_total);
const op=(s,type,payload)=>executeCommand(s,{operationId:id(),expectedRevision:s.revision,epoch:s.epoch,issuedAt:new Date().toISOString(),type,payload}).state;
test('8 products uniquely match the exact card QR payloads',()=>{
 assert.equal(svc.products.length,8);assert.equal(new Set(svc.products.map(p=>p.qr_payload)).size,8);
 for(const p of svc.products){assert.equal(svc.product(p.qr_payload)?.id,p.id);assert.equal(svc.product(p.id),null);assert.equal(Number(p.price)>=0,true);}
 assert.equal(svc.product('foodwise:receipt:v1:FW-R01'),null);
});
test('8 receipts uniquely match QR codes and all printed totals',()=>{
 assert.equal(svc.receipts.length,8);assert.equal(new Set(svc.receipts.map(r=>r.qr_payload)).size,8);
 for(const r of svc.receipts){assert.equal(svc.receipt(r.qr_payload)?.receipt_id,r.receipt_id);assert.equal(r.items.length,5);assert.equal(r.items.reduce((a,i)=>a+money(i),0).toFixed(2),Number(r.total).toFixed(2));}
 assert.equal(svc.receipt('foodwise:ghostbuy:product:v1:GB-P03'),null);
});
test('receipt QR maps to exactly five editable Food Management items',()=>{
 const r=svc.receipt('foodwise:receipt:v1:FW-R01');const rows=svc.receiptRows(r,id);
 assert.deepEqual(rows.map(x=>x.name),r.items.map(x=>x.name));
 let s=seed('en','test-epoch');
 s=op(s,'receipt_confirm',{id:'scan-001',rows,qrPayload:r.qr_payload,receiptId:r.receipt_id,storeName:r.store,receiptTotal:r.total});
 assert.equal(s.foodItems.filter(x=>x.source==='receipt').length,5);
 assert.equal(s.receiptImports[0].simulated,false);
 assert.equal(s.receiptImports[0].qrPayload,r.qr_payload);
 // A different import ID of the same fixture must be rejected before mutating inventory.
 assert.throws(()=>op(s,'receipt_confirm',{id:'scan-002',rows,qrPayload:r.qr_payload}),/alreadyImported/);
});
test('multi-pack prices are totals, never multiplied by 6/12/24',()=>{
 for(const [id,qty,price] of [['GB-P03','6','9.00'],['GB-P05','12','9.00'],['GB-P08','24','12.00']]){
  const p=svc.getProduct(id);const row=svc.cartRow(p,()=>id);
  assert.equal(row.quantity,qty);assert.equal(row.priceMeaning,'unit');assert.equal(Math.round(Number(row.price)*Number(row.quantity)*100),Number(price)*100);assert.equal(row.productId,id);
  let s=seed('en','test-epoch');s=op(s,'cart_save',{rows:[row]});s=op(s,'checkout',{});
  assert.equal(s.purchaseItems[0].estimateCents,Number(price)*100);
  assert.equal(s.foodItems.length,0,'Ghost checkout must not mutate actual inventory');
 }
});
