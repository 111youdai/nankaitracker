import core from './core.cjs';
const {tableNumbers,numberKey,formation}=core;
export const read=async(db,key)=>{const r=await db.prepare('SELECT value FROM meta WHERE key=?').bind(key).first();return r?JSON.parse(r.value):null;};
export const put=(db,key,v)=>db.prepare('INSERT OR REPLACE INTO meta VALUES (?,?)').bind(key,JSON.stringify(v));
export async function requestJson(url,options={}){
 const r=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error(`取得失敗 HTTP ${r.status}`);
 const text=await r.text();if(text.length>3000000)throw Error('取得データが上限を超えました');
 return JSON.parse(text);
}
async function hub(endpoint,p){return requestJson('https://unyohub.2pd.jp/api/'+endpoint+'.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...p,last_modified_timestamp:'0'})});}
export async function refresh(db,now,request=hub){
 const group=['nankai','nankai','koya','koya'][Math.floor(now.getTime()/900000)%4];
 const diagram=['weekday','holiday','weekday','holiday'][Math.floor(now.getTime()/900000)%4];
 const revisions=await request('diagram_revisions',{railroad_id:group});
 if(!Array.isArray(revisions)||!revisions.every(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)))throw Error('ダイヤ改正一覧が不正です');
 await put(db,'revisions:'+group,{revisions,checkedAt:now.toISOString()}).run();
 const revision=revisions.filter(r=>r<=core.serviceDate(now)).sort().at(-1);
 if(!revision)throw Error('対象ダイヤがありません');
 const parsed=tableNumbers(await request('operation_table',{railroad_id:group,diagram_revision:revision,diagram_id:diagram}));
 const expected=group==='nankai'?['honsen','kukosen','shiomibashisen','takashinohamasen','tanagawasen','kadasen','wakayamakosen']:['koyasen','sembokusen'];
 if(expected.some(x=>!parsed.lines.includes(x)))throw Error('運用表に必要な支線がありません');
 await db.prepare('INSERT OR REPLACE INTO baselines VALUES (?,?,?,?,?)').bind(group,diagram,revision,now.toISOString(),JSON.stringify(parsed)).run();
 await put(db,'refresh',{lastSuccess:now.toISOString(),error:null,group,diagram,revision}).run();
}
export async function baseline(db,day,now){
 const manifests=await db.prepare("SELECT key,value FROM meta WHERE key IN ('revisions:nankai','revisions:koya')").all();
 const ms=Object.fromEntries(manifests.results.map(r=>[r.key,JSON.parse(r.value)]));
 const rev={};
 for(const group of ['nankai','koya']){
  const m=ms['revisions:'+group];
  if(!m||now-new Date(m.checkedAt)>7200000)throw Error('ダイヤ改正情報の更新待ちです');
  rev[group]=m.revisions.filter(x=>x<=day).sort().at(-1);if(!rev[group])throw Error('対象日の運用表がありません');
 }
 const rows=(await db.prepare('SELECT * FROM baselines WHERE (group_name=? AND revision=?) OR (group_name=? AND revision=?)').bind('nankai',rev.nankai,'koya',rev.koya).all()).results;
 if(rows.length!==4)throw Error('通常ダイヤ4表の準備待ちです');
 const sets={nankai:new Set(),koya:new Set()},sources=[];
 for(const row of rows){
  if(day===core.serviceDate(now)&&now-new Date(row.fetched_at)>7200000)throw Error('運用表の更新待ちです');
  const p=JSON.parse(row.payload);for(const n of p.numbers)sets[row.group_name].add(n);for(const n of p.branch)sets.koya.add(n);
  sources.push({group:row.group_name,diagram:row.diagram,revision:row.revision,fetchedAt:row.fetched_at,url:`https://unyohub.2pd.jp/railroad_${row.group_name}/operation_table/${row.revision}/${row.diagram}/`});
 }
 return {numbers:sets,sources,date:day,fetchedAt:sources.map(s=>s.fetchedAt).sort()[0]};
}
export async function classify(db,row,b,maxCandidates=10){
 const p=JSON.parse(row.payload),remaining=[],statements=[];let count=0;
 for(const t of p.trains){
  const key=numberKey(t.train_number);if(!key||b.numbers[row.group_name].has(key))continue;
  if(count++>=maxCandidates){remaining.push(t);continue;}
  const raw=JSON.stringify(t),form=JSON.stringify(formation(t));
  statements.push(db.prepare(`INSERT INTO events(service_date,group_name,train_key,train_number,first_seen,last_seen,formation,baseline,last_payload) VALUES (?,?,?,?,?,?,?,?,?)
  ON CONFLICT(service_date,group_name,train_key) DO UPDATE SET
   first_seen=MIN(events.first_seen,excluded.first_seen),last_seen=MAX(events.last_seen,excluded.last_seen),
   formation=CASE WHEN (excluded.last_seen>=events.last_seen AND json_extract(excluded.formation,'$.verified')=1) OR json_extract(events.formation,'$.verified')=0 THEN excluded.formation ELSE events.formation END,
   last_payload=CASE WHEN excluded.last_seen>=events.last_seen THEN excluded.last_payload ELSE events.last_payload END`).bind(row.service_date,row.group_name,key,String(t.train_number),row.source_time,row.source_time,form,JSON.stringify(b.sources),raw));
  statements.push(db.prepare(`INSERT OR IGNORE INTO observations(event_id,source_time,observed_at,payload) SELECT id,?,?,? FROM events WHERE service_date=? AND group_name=? AND train_key=?`).bind(row.source_time,p.observedAt,raw,row.service_date,row.group_name,key));
 }
 statements.push(remaining.length?db.prepare('UPDATE pending SET payload=? WHERE id=?').bind(JSON.stringify({...p,trains:remaining}),row.id):db.prepare('DELETE FROM pending WHERE id=?').bind(row.id));
 await db.batch(statements); // D1 batch is atomic: no lost queue entry on a failed write.
 return {saved:Math.min(count,maxCandidates),remaining:remaining.length};
}
export async function poll(db,now,request=requestJson){
 const previous=await read(db,'monitor');
 const status={baseline:previous?.baseline||null,lastPoll:now.toISOString(),lastSuccess:null,feedError:null,baselineError:null,groups:{},intervalSeconds:60};
 try{
  const feed=await request('https://external-data.nankaiapp.com/tid/trains.json');
  if(!Array.isArray(feed.trains)||feed.trains.length>1000)throw Error('列車一覧の形式が不正です');
  const stmts=[];
  for(const [id,group] of Object.entries(core.GROUPS)){
   try{
    const time=core.sourceTime(feed,group),age=now-new Date(time);
    if(age>300000||age< -60000)throw Error('配信時刻が古いか不正です');
    const trains=feed.trains.filter(t=>Number(t.line_id)===Number(id));
    if(trains.some(t=>!['string','number'].includes(typeof t.train_number)))throw Error('列番が不正です');
    // The last source timestamp and queue insertion are committed together.
    stmts.push(db.prepare(`INSERT OR IGNORE INTO pending(group_name,source_time,service_date,payload) SELECT ?,?,?,? WHERE ? > COALESCE((SELECT json_extract(value,'$') FROM meta WHERE key=?),'')`).bind(group,time,core.serviceDate(time),JSON.stringify({observedAt:now.toISOString(),trains}),time,'last-source:'+group));
    stmts.push(db.prepare(`INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=MAX(meta.value,excluded.value)`).bind('last-source:'+group,JSON.stringify(time)));
    status.groups[group]={sourceTime:time,trainCount:trains.length,error:null};
   }catch(e){status.groups[group]={error:e.message};}
  }
  if(stmts.length)await db.batch(stmts);
  status.lastSuccess=now.toISOString();
 }catch(e){status.feedError=e.message;}
 // Bound each invocation to <50 D1 queries on Free, even when many unusual trains appear.
 let budget=10;
 const pending=(await db.prepare('SELECT * FROM pending ORDER BY source_time,id LIMIT 6').all()).results;
 const cache=new Map();
 for(const row of pending){
  if(budget<=0)break;
  try{
   if(!cache.has(row.service_date))cache.set(row.service_date,await baseline(db,row.service_date,now));
   const b=cache.get(row.service_date),result=await classify(db,row,b,budget);budget-=result.saved;
   status.baseline={date:b.date,fetchedAt:b.fetchedAt,sources:b.sources};
  }catch(e){status.baselineError=e.message;}
 }
 await put(db,'monitor',status).run();return status;
}
