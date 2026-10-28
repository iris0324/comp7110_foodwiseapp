/** Fixed classroom fixtures. UI calls this service, never hardcodes product/receipt arrays.
 * Replace the loader with a remote catalog adapter in the backend phase.
 */
export class CatalogService {
  constructor(fetcher=(...args)=>globalThis.fetch(...args)){this.fetcher=fetcher;this.products=[];this.receipts=[];}
  async load(){
    const [p,r]=await Promise.all(['data/products.json','data/receipts.json'].map(async url=>{
      const response=await this.fetcher(url);if(!response.ok)throw Error('Catalog unavailable: '+url);
      return response.json();
    }));
    if(p.products?.length!==8||r.receipts?.length!==8)throw Error('Incomplete QR fixture catalog');
    this.products=p.products;this.receipts=r.receipts;
    return this;
  }
  product(qr){return this.products.find(p=>p.qr_payload===String(qr||'').trim())||null;}
  receipt(qr){return this.receipts.find(r=>r.qr_payload===String(qr||'').trim())||null;}
  getProduct(id){return this.products.find(p=>p.id===id)||null;}
  static foodCategory(name){
    const n=name.toLowerCase();
    if(/milk|yoghurt|yogurt|cheese/.test(n))return 'dairy';
    if(/egg|chicken|beef|fish/.test(n))return 'protein';
    if(/bread|oats|rice|pasta/.test(n))return 'staples';
    if(/banana|apple|broccoli|carrot|tomato|spinach|mushroom|lettuce|avocado|berry|berries|capsicum|zucchini|onion|cucumber|strawberr/.test(n))return 'produce';
    if(/chocolate|coffee|sandwich|fruit cup|peanut butter/.test(n))return 'snacks';
    return 'other';
  }
  receiptRows(receipt,idMaker){
    return receipt.items.map(item=>({
      id:idMaker(),name:item.name,quantity:String(item.quantity),unit:item.unit||'pack',
      category:CatalogService.foodCategory(item.name),recordedDate:'',location:'',planDate:'',
      receiptPrice:item.line_total
    }));
  }
  cartRow(product,idMaker){
    return {cartItemId:idMaker(),productId:product.id,name:`${product.brand} · ${product.name}`,
      quantity:String(product.quantity),price:(Number(product.price)/Math.max(1,Number(product.quantity))).toFixed(2),priceMeaning:'unit',
      note:`${product.size} · ${product.promotion||''}`.trim(),
      asset:/milk/i.test(product.name)?'milk':/chocolate/i.test(product.name)?'chocolate':'bag'};
  }
}
