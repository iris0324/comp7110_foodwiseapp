const SCALE=100000000n;
export function fail(key){throw new Error(key);}
export function decimal(value,{zero=true,input=false}={}){
 const s=String(value??'').trim();
 if(!new RegExp('^\\d+(?:\\.\\d{1,'+(input?6:8)+'})?$').test(s))fail('quantityError');
 const [a,b='']=s.split('.');const n=BigInt(a)*SCALE+BigInt(b.padEnd(8,'0'));
 if(n>1000000n*SCALE||(!zero&&n===0n))fail('quantityError');return n;
}
export function formatDecimal(n){const a=n/SCALE,b=(n%SCALE).toString().padStart(8,'0').replace(/0+$/,'');return a.toString()+(b?'.'+b:'');}
export const qty=(v,positive=false)=>formatDecimal(decimal(v,{zero:!positive,input:true}));
export function usageQty(value){if(!/^\d+(?:\.\d{1,7})?$/.test(String(value??'').trim()))fail('amountError');return formatDecimal(decimal(value));}
export const sub=(a,b)=>formatDecimal(decimal(a)-decimal(b));
export const add=(a,b)=>formatDecimal(decimal(a)+decimal(b));
export const half=a=>formatDecimal(decimal(a)/2n);
export const cmp=(a,b)=>decimal(a)<decimal(b)?-1:decimal(a)>decimal(b)?1:0;
export function cents(raw){const s=String(raw??'').trim();if(s==='')return null;if(!/^\d+(?:\.\d{1,2})?$/.test(s))fail('moneyError');const [a,b='']=s.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(!Number.isSafeInteger(n)||n>999999999)fail('moneyError');return n;}
// Round the proportional saving once, in integer cents, including fractional quantities.
export function proportionalCents(total, reduction, original){
 if(total===null)return null;
 if(!Number.isSafeInteger(total)||total<0)fail('moneyError');
 const part=decimal(reduction),whole=decimal(original,{zero:false});
 if(part>whole)fail('reductionError');
 return Number((BigInt(total)*part+whole/2n)/whole);
}
export function reductionQty(raw,original){let value;try{value=qty(raw,true);}catch{fail('reductionError');}if(cmp(value,original)>=0)fail('reductionError');return value;}
export const money=(n)=>n===null?null:(n/100).toFixed(2);
export function date(raw){if(!raw)return null;const s=String(raw);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))fail('dateError');const [y,m,d]=s.split('-').map(Number);if(y<1900||y>2200||m<1||m>12||d<1||d>new Date(y,m,0).getDate())fail('dateError');return s;}
export function today(now=new Date()){return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}
export const dayNumber=s=>{date(s);const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000;};
export const daysUntil=(s,base=today())=>s?dayNumber(s)-dayNumber(base):null;
export function relativeDate(n,base=today()){const [y,m,d]=base.split('-').map(Number);return today(new Date(y,m-1,d+n,12));}
export const uid=()=>globalThis.crypto.randomUUID();
export const nameKey=s=>String(s).trim().toLocaleLowerCase();
export function required(s,key='nameError'){if(!String(s??'').trim())fail(key);return String(s);}
export const clone=s=>structuredClone(s);
