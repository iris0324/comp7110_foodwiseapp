import {Repository as LocalRepository} from './local-repository.js?v=13.0';
import {supabase} from '../services/supabase.js';
import {seed} from '../data/seed.js?v=13.0';
import {executeCommand,normalizeState} from '../domain/commands.js?v=13.0';

export class Repository {
 constructor(){this.name='FoodWise-cloud';this.local=null;this.user=null;this.failure=null;}
 async open(){
  if(supabase){const {data,error}=await supabase.auth.getSession();if(error)throw error;this.user=data.session?.user||null;}
  if(!this.user){this.local=new LocalRepository();return this.local.open();}
  this.local?.close();this.local=null;
  return this.load(true);
 }
 async load(){
  if(!this.user)return this.local.load();
  const {data,error}=await supabase.rpc('foodwise_load',{initial_state:seed('en',crypto.randomUUID())});
  if(error)throw error;
  return normalizeState(data);
 }
 async commitCommand(command,media=[]){
  if(!this.user)return this.local.commitCommand(command,media);
  const owner=this.user.id;
  const current=await this.load();
  const out=executeCommand(current,command);
  if(out.replayed)return out;
  if(this.failure){const reason=this.failure;this.failure=null;throw Error(reason);}
  const uploads=await Promise.all(media.map(async m=>({id:m.id,type:m.blob.type,data:await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(m.blob);})})));
  if(this.user?.id!==owner)throw Error('sessionChanged');
  const {error}=await supabase.rpc('foodwise_save',{expected_revision:current.revision,expected_epoch:current.epoch,next_state:out.state,uploads,clear_media:command.type==='reset'});
  if(error)throw Error(error.message.includes('conflict')?'conflict':error.message);
  return out;
 }
 async getMedia(id){
  if(!this.user)return this.local.getMedia(id);
  const {data,error}=await supabase.from('foodwise_media').select('data,mime_type').eq('id',id).eq('user_id',this.user.id).maybeSingle();
  if(error)throw error;if(!data)return null;
  return new Blob([Uint8Array.from(atob(data.data),c=>c.charCodeAt(0))],{type:data.mime_type});
 }
 close(){this.local?.close();}
}
