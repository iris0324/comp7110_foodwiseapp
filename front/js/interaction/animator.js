export const durations={feed:4700,store:1900,share:2000,time:2000,risk:2300,uncertain:1200,keep:1500};
export class Animator {
 constructor(){this.timers=[];this.active=null;}
 cancel(){this.timers.forEach(clearTimeout);this.timers=[];this.active=null;}
 play(token,kind,phase,finish){this.cancel();this.active=token;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;phase('receive');const list=kind==='feed'?[[650,'mouth'],[1400,'enjoy'],[3400,'swallow'],[4100,'finish']]:[[400,'enjoy'],[durations[kind]-400,'finish']];if(!reduced)for(const [ms,p]of list)this.timers.push(setTimeout(()=>{if(this.active===token)phase(p);},ms));this.timers.push(setTimeout(()=>{if(this.active===token){this.cancel();finish();}},reduced?250:durations[kind]));}
}
