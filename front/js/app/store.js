import {uid} from '../core/values.js?v=13.0';
import {executeCommand} from '../domain/commands.js?v=13.0';
export class Store {
 constructor(repository){this.repository=repository;this.state=null;this.status='idle';this.pending=null;this.error=null;this.changed=()=>{};this.channel=globalThis.BroadcastChannel?new BroadcastChannel(repository.name):null;this.channel?.addEventListener('message',()=>this.onExternal?.());}
 async open(){this.state=await this.repository.open();return this.state;}
 async commit(type,payload={},media=[],done=()=>{}){
  if(this.status==='saving'||this.pending)return false;
  const command={operationId:uid(),expectedRevision:this.state.revision,epoch:this.state.epoch,issuedAt:new Date().toISOString(),type,payload:structuredClone(payload)};
  // Invalid fields never enter the retry queue. A retry always means a failed transaction.
  try{executeCommand(this.state,command);}catch(e){this.error=e.message;this.changed();return false;}
  this.pending={command,media,done};return this.retry();
 }
 async retry(){if(!this.pending||this.status==='saving')return false;this.status='saving';this.error=null;this.changed();const job=this.pending;try{const out=await this.repository.commitCommand(job.command,job.media);this.state=out.state;this.pending=null;this.status='saved';this.channel?.postMessage(this.state.revision);job.done(out.result);this.changed();return true;}catch(e){this.status='save_failed';this.error=e.message;this.changed();return false;}}
 async reload(){const next=await this.repository.load();this.state=next;this.pending=null;this.error=null;this.status='idle';this.changed();}
}
