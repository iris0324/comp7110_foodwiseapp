import {CONFIG} from '../config.js?v=13.0';
import {seed} from '../data/seed.js?v=13.0';
import {executeCommand,normalizeState} from '../domain/commands.js?v=13.0';
export class Repository {
 constructor(name=CONFIG.dbName){this.name=name;this.db=null;this.failure=null;}
 async open(){this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>{r.result.createObjectStore('app');r.result.createObjectStore('media');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('initError'));r.onblocked=()=>reject(Error('blocked'));});this.db.onversionchange=()=>this.db.close();return this.load(true);}
 load(initialize=false){return new Promise((resolve,reject)=>{const tx=this.db.transaction('app',initialize?'readwrite':'readonly'),store=tx.objectStore('app');let state;const r=store.get('snapshot');r.onsuccess=()=>{state=r.result;if(!state&&initialize){state=seed('en',crypto.randomUUID());store.put(state,'snapshot');}if(state&&state.schemaVersion!==CONFIG.schemaVersion){state=null;tx.abort();}};tx.oncomplete=()=>state?resolve(normalizeState(state)):reject(Error('schemaError'));tx.onabort=()=>reject(Error('schemaError'));tx.onerror=()=>{};});}
 commitCommand(command,media=[]){return new Promise((resolve,reject)=>{let out,error;const tx=this.db.transaction(['app','media'],'readwrite');const r=tx.objectStore('app').get('snapshot');r.onsuccess=()=>{try{out=executeCommand(r.result,command);if(this.failure){const reason=this.failure;this.failure=null;throw Error(reason);}if(!out.replayed){if(command.type==='reset')tx.objectStore('media').clear();for(const m of media)tx.objectStore('media').put(m.blob,m.id);tx.objectStore('app').put(out.state,'snapshot');}}catch(e){error=e;tx.abort();}};tx.oncomplete=()=>resolve(out);tx.onabort=()=>reject(error||Error('saveError'));tx.onerror=()=>{};});}
 getMedia(id){return new Promise((resolve,reject)=>{const tx=this.db.transaction('media');let blob;const r=tx.objectStore('media').get(id);r.onsuccess=()=>blob=r.result;tx.oncomplete=()=>resolve(blob);tx.onabort=()=>reject(Error('previewError'));});}
 close(){this.db?.close();}
}
