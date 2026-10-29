import {poll,refresh,read,put} from './data.mjs';
import {issue,authorized,samePassword} from './auth.mjs';
import core from './core.cjs';
import stations from './stations.cjs';
const {specialService}=core;
const {trajectoryPositions}=stations;
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json;charset=UTF-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handle(request,env){
 const u=new URL(request.url),p=u.pathname,db=env.DB;
 try{
  if(p==='/api/auth/logs'&&request.method==='POST'){
   if(!env.LOG_ACCESS_PASSWORD)return json({error:'Cloudflareにログ用パスワードが未設定です'},503);
   const body=await request.text();if(body.length>1024)return json({error:'リクエストが大きすぎます'},413);
   let data;try{data=JSON.parse(body);}catch{return json({error:'JSONが不正です'},400);}
   if(!await samePassword(data.password,env.LOG_ACCESS_PASSWORD))return json({error:'パスワードが違います'},401);
   return json({ok:true,token:await issue(env.LOG_ACCESS_PASSWORD),expires_in:43200});
  }
  if(p.startsWith('/api/logs')){
   if(!await authorized(request,env.LOG_ACCESS_PASSWORD))return json({error:'ログ閲覧にはパスワードが必要です'},401);
   if(request.method!=='GET')return json({error:'許可されていない操作です'},405);
   if(p==='/api/logs/status'){
    const s=await read(db,'monitor')||{intervalSeconds:60,groups:{},lastSuccess:null};
    s.refresh=await read(db,'refresh');
    s.pending=(await db.prepare('SELECT COUNT(*) AS n FROM pending').first()).n;
    s.healthy=!!s.baseline&&!s.feedError&&!s.baselineError&&Date.now()-Date.parse(s.lastSuccess)<180000&&Object.keys(s.groups).length===2&&Object.values(s.groups).every(g=>!g.error);
    return json(s);
   }
   if(p==='/api/logs'){
    const date=u.searchParams.get('date')||'',group=u.searchParams.get('group')||'',q=(u.searchParams.get('q')||'').slice(0,80),before=Number(u.searchParams.get('before')||Number.MAX_SAFE_INTEGER);
    if((date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))||(group&&!['nankai','koya'].includes(group))||!Number.isSafeInteger(before)||before<1)return json({error:'検索条件が不正です'},400);
    const ignored=core.IGNORED_TRAIN_KEYS;
    let sql=`SELECT events.*,
     (SELECT payload FROM observations o WHERE o.event_id=events.id ORDER BY o.source_time,o.id LIMIT 1) AS first_payload,
     (SELECT payload FROM observations o WHERE o.event_id=events.id ORDER BY o.source_time,o.id LIMIT 1 OFFSET 1) AS second_payload,
     (SELECT payload FROM observations o WHERE o.event_id=events.id ORDER BY o.source_time DESC,o.id DESC LIMIT 1 OFFSET 1) AS previous_payload
     FROM events WHERE id<?${ignored.length?` AND train_key NOT IN (${ignored.map(()=>'?').join(',')})`:''}`,args=[before,...ignored];
    if(date){sql+=' AND service_date=?';args.push(date);}if(group){sql+=' AND group_name=?';args.push(group);}
    if(q){sql+=' AND (train_number LIKE ? OR formation LIKE ? OR EXISTS(SELECT 1 FROM observations o WHERE o.event_id=events.id AND o.payload LIKE ?))';args.push(`%${q}%`,`%${q}%`,`%${q}%`);}
    const rows=(await db.prepare(sql+' ORDER BY id DESC LIMIT 100').bind(...args).all()).results;
    const items=rows.map(e=>{const {second_payload,previous_payload,...event}=e,first=JSON.parse(e.first_payload||e.last_payload),second=second_payload?JSON.parse(second_payload):null,previous=previous_payload?JSON.parse(previous_payload):null,last=JSON.parse(e.last_payload);
     const firstPosition=trajectoryPositions(second?[first,second]:[first],{eventStart:true})[0];
     const lastPositions=trajectoryPositions(previous?[previous,last]:[last],{eventEnd:true}),lastPosition=lastPositions.at(-1);
     return {...event,formation:JSON.parse(e.formation),baseline:JSON.parse(e.baseline),first_payload:first,last_payload:last,first_position:firstPosition,last_position:lastPosition,observed_range:{first:firstPosition,last:lastPosition,text:`初回：${firstPosition.text} ／ 最終：${lastPosition.text}`},special:specialService(e.train_number,e.service_date)};});
    return json({items,next:items.length===100?items.at(-1).id:null});
   }
   const m=p.match(/^\/api\/logs\/(\d+)\/observations$/);
   if(m){const id=Number(m[1]),after=Number(u.searchParams.get('after')||0);if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(after)||after<0)return json({error:'IDが不正です'},400);
    const rows=(await db.prepare('SELECT * FROM observations WHERE event_id=? AND id>? ORDER BY id LIMIT 501').bind(id,after).all()).results,hasMore=rows.length>500,page=rows.slice(0,500),payloads=rows.map(r=>JSON.parse(r.payload)),positions=trajectoryPositions(payloads,{eventStart:after===0,eventEnd:!hasMore});
    return json({items:page.map((r,index)=>({...r,payload:payloads[index],position:positions[index]})),next:hasMore?page.at(-1).id:null});
   }
   return json({error:'見つかりません'},404);
  }
  if(p.startsWith('/api/'))return json({error:'見つかりません'},404);
  if(p==='/'||p==='/logs.html'||p==='/logs'||p==='/logs.js'){
   u.pathname=p==='/logs.js'?'/logs.js':'/logs.html';return env.ASSETS.fetch(new Request(u,request));
  }
  return json({error:'見つかりません'},404);
 }catch(e){console.error('request failed',e.message);return json({error:'データを取得できません。CloudflareのログとD1設定を確認してください'},503);}
}
export default {
 fetch:handle,
 async scheduled(event,env){
  const now=new Date(event.scheduledTime);
  if(event.cron==='*/15 * * * *'){
   try{await refresh(env.DB,now);}catch(e){console.error('baseline refresh',e.message);await put(env.DB,'refresh',{error:e.message,attemptedAt:now.toISOString()}).run();throw e;}
  }else{
   // SQL lease avoids double processing if scheduled executions overlap.
   const minute=Math.floor(event.scheduledTime/60000),lease=await env.DB.prepare(`INSERT OR IGNORE INTO meta(key,value) VALUES (?,?)`).bind('lease:'+minute,JSON.stringify(now.toISOString())).run();
   if(!lease.meta.changes)return;
   try{await poll(env.DB,now);}catch(e){console.error('monitor',e.message);await put(env.DB,'monitor',{lastPoll:now.toISOString(),lastSuccess:null,intervalSeconds:60,groups:{},feedError:e.message}).run();throw e;}
   finally{await env.DB.prepare("DELETE FROM meta WHERE key LIKE 'lease:%' AND key<?").bind('lease:'+(minute-60)).run();}
  }
 }
};
