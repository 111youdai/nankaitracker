'use strict';
const $=id=>document.getElementById(id),KEY='nankaiTrackerCloudLogToken';
let token=sessionStorage.getItem(KEY)||'',next=null,params=new URLSearchParams(),busy=false,fleetLoaded=false,logsLoaded=false;
const time=x=>x?new Date(x).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false}):'未確認';
const clock=x=>x?new Date(x).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}):'時刻不明';
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
async function api(url,options={}){
 const response=await fetch(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
 const data=await response.json();
 if(!response.ok){if(response.status===401){token='';sessionStorage.removeItem(KEY);$('loginPanel').hidden=false;$('main').hidden=true;}throw new Error(data.error||`HTTP ${response.status}`);}return data;
}
function error(e){$('error').textContent=e.message;}
function timelineTime(point){const start=point.timeLabel||clock(point.time),end=point.endTimeLabel||(point.endTime?clock(point.endTime):'');return end&&end!==start?`${start}〜${end}`:start;}
function timelineView(timeline){
 const box=el('section',undefined,'timeline');box.append(el('h3','推定通過時刻'));
 if(!timeline?.available){box.append(el('p','この記録は、距離計算に必要な位置がまだ足りません。','muted'));return box;}
 const summary=el('div',undefined,'timeline-summary');summary.append(el('span',`記録区間 ${timeline.distanceKm} km`),el('span',`平均 ${timeline.averageSpeedKmh} km/h`));box.append(summary);
 const list=el('ol',undefined,'timeline-list');for(const point of timeline.points){const row=el('li'),when=el('time',timelineTime(point)),station=el('span',point.station+'駅'),kind=el('small',point.kind==='observed'?'実測':point.kind==='known'?'既知時刻':'推定','timeline-kind '+point.kind);row.append(when,station,kind);if(point.note)row.title=point.note;list.append(row);}box.append(list,el('p',timeline.note,'timeline-note'));return box;
}
function showView(name){
 const fleet=name==='fleet';$('logView').hidden=fleet;$('fleetView').hidden=!fleet;
 document.querySelectorAll('[data-log-view]').forEach(button=>button.classList.toggle('active',button.dataset.logView===(fleet?'fleet':'log')));
 history.replaceState(null,'',fleet?'#fleet':'#log');
 if(fleet&&!fleetLoaded)void loadFleet();
 if(!fleet&&!logsLoaded)void load();
}
async function status(){
 try{const s=await api('/api/logs/status');const box=$('status');box.className='panel'+(s.healthy?' ok':'');box.replaceChildren(el('strong',s.healthy?'クラウドで監視中':'監視・照合の状態を確認してください'));
 box.append(el('p',`最終取得：${time(s.lastSuccess)} ／ 取得間隔：${s.intervalSeconds}秒 ／ 照合待ち：${s.pending}件`));
 for(const [g,v] of Object.entries(s.groups))box.append(el('div',`${g==='nankai'?'南海線':'高野線'}：${v.error||`配信時刻 ${time(v.sourceTime)}・${v.trainCount}列車`}`));
 if(s.refresh?.error)box.append(el('p','運用表の更新に失敗：'+s.refresh.error,'error'));
 if(s.feedError||s.baselineError)box.append(el('p',[s.feedError,s.baselineError].filter(Boolean).join(' / '),'error'));
 if(s.baseline)box.append(el('small',`照合データ更新：${time(s.baseline.fetchedAt)}。画面を閉じても、Cloudflareで毎分監視を継続します。`));
 }catch(e){$('status').className='panel';$('status').textContent='監視状況を取得できません。監視中かどうか確認できない状態です。';error(e);}
}
async function allHistory(id){let after=0,items=[];do{const d=await api(`/api/logs/${id}/observations?after=${after}`);items.push(...d.items);after=d.next;}while(after);return items;}
const trainKey=value=>String(value??'').normalize('NFKC').replace(/^0+(?=\d)/,'');
const atNamba=position=>/なんば/.test(`${position?.current||''} ${position?.text||''}`);
function formationKey(event){
 const formation=event.formation;
 return formation?.verified&&!/未確認/.test(formation.text||'')?String(formation.text).replace(/\s+/g,'').toUpperCase():'';
}
function canLink(first,second){
 if(first.service_date!==second.service_date||!atNamba(first.last_position)||!atNamba(second.first_position))return false;
 const gap=Date.parse(second.first_seen)-Date.parse(first.last_seen);
 if(!Number.isFinite(gap)||gap < -120000||gap > 45*60000)return false;
 const explicit=trainKey(first.train_number)==='8450'&&['8673','8070'].includes(trainKey(second.train_number)),a=formationKey(first),b=formationKey(second);
 return explicit?(!a||!b||a===b):!!a&&a===b;
}
function groupRuns(items){
 const ordered=[...items].sort((a,b)=>Date.parse(a.first_seen)-Date.parse(b.first_seen)||a.id-b.id),used=new Set(),groups=[];
 for(const event of ordered){
  if(used.has(event.id))continue;
  const chain=[event];used.add(event.id);
  while(true){const next=ordered.find(candidate=>!used.has(candidate.id)&&canLink(chain.at(-1),candidate));if(!next)break;chain.push(next);used.add(next.id);}
  groups.push(chain);
 }
 return groups.sort((a,b)=>Math.max(...b.map(x=>x.id))-Math.max(...a.map(x=>x.id)));
}
function chainRange(events){const first=events[0],last=events.at(-1);return `${first.display_range?.first||'確認できません'} → ${last.display_range?.last||'確認できません'}`;}
function chainGroups(events){return [...new Set(events.map(event=>event.group_name==='nankai'?'南海線系統':'高野線系統'))].join(' → ');}
function verifiedFormation(events){return [...events].reverse().find(event=>formationKey(event))?.formation?.text||events.at(-1).formation?.text||'編成未確認';}
function appendHistory(history,event,data,result,linked){
 if(linked)history.append(el('h3',`${event.train_number}列車`,'segment-title'));
 history.append(timelineView(result.timeline));
 const observations=el('details',undefined,'observation-group');observations.append(el('summary',`在線履歴 ${data.length}件（開く）`));
 const observationList=el('div',undefined,'observation-list');
 for(const observation of data){const row=el('details'),where=observation.position?.text||'位置不明';row.append(el('summary',`${clock(observation.source_time)}　${where}`),el('pre',JSON.stringify(observation.payload,null,2)));observationList.append(row);}
 observations.append(observationList);history.append(observations);
 const baseline=el('details');baseline.append(el('summary','照合した運用表'),el('pre',JSON.stringify(event.baseline,null,2)));history.append(baseline);
}
function card(input){
 const events=Array.isArray(input)?input:[input],e=events[0],lastEvent=events.at(-1),linked=events.length>1,known=lastEvent.special||e.special,a=el('article',undefined,linked?'linked-card':''),top=el('div',undefined,'top'),numbers=events.map(event=>`${event.train_number}列車`).join(' → ');
 top.append(el('h2',numbers),el('span',linked?'一連の運転':known?.label||'定期外候補','tag'+(known||linked?' known':'')));a.append(top);
 if(linked){
  const explicit=trainKey(e.train_number)==='8450'&&['8673','8070'].includes(trainKey(lastEvent.train_number)),box=el('div',undefined,'known-service chain-service');
  box.append(el('strong',explicit?'千代田入場回送':'なんば折返しを含む一連の運転'),el('div','列番：'+numbers),el('div','運転区間：'+chainRange(events)),el('small','同一編成・なんばでの折返し・前後の確認時刻から一連の運転としてまとめています。'));a.append(box);
 }else if(known){const box=el('div',undefined,'known-service');box.append(el('strong',known.label));if(known.route)box.append(el('div','区間：'+known.route));if(known.schedule)box.append(el('div','時刻：'+known.schedule));if(known.note)box.append(el('small',known.note));a.append(box);}
 const details=el('div',undefined,'details'),rows=[['編成（最後に検証できた値）',verifiedFormation(events)],['運行日・系統',`${e.service_date} ／ ${chainGroups(events)}`],['初回 → 最終確認',`${time(e.first_seen)} → ${time(lastEvent.last_seen)}`],['推定した運転区間',chainRange(events)],['最終確認地点',lastEvent.display_range?.last||'確認できません']];
 if(linked)rows.splice(1,0,['列番のつながり',numbers]);
 for(const [label,value] of rows){const cell=el('div',label,'muted');cell.append(el('b',value));details.append(cell);}a.append(details);
 const button=el('button',linked?'各列車の推定時刻・在線履歴':'推定時刻・在線履歴'),history=el('div',undefined,'history');history.hidden=true;a.append(button,history);
 button.onclick=async()=>{if(!history.hidden){history.hidden=true;return;}button.disabled=true;try{const results=await Promise.all(events.map(async event=>({event,data:await allHistory(event.id),result:await api(`/api/logs/${event.id}/timeline`)})));history.replaceChildren();for(const item of results)appendHistory(history,item.event,item.data,item.result,linked);history.hidden=false;}catch(exception){error(exception);}finally{button.disabled=false;}};
 return a;
}
async function load(reset=true){if(busy)return;busy=true;$('error').textContent='';try{
 if(reset){params=new URLSearchParams({date:$('date').value,group:$('group').value,q:$('query').value});next=null;}
 const query=new URLSearchParams(params);if(next)query.set('before',next);
 const data=await api('/api/logs?'+query);if(reset)$('events').replaceChildren();for(const group of groupRuns(data.items))$('events').append(card(group));
 if(reset&&!data.items.length)$('events').append(el('p','該当する記録はありません。監視開始前の履歴は取得できません。'));
 if(reset)logsLoaded=true;
 next=data.next;$('more').hidden=!next;await status();
 }catch(e){error(e);}finally{busy=false;}}
const categoryOrder=['6両（固定）','4両（固定）','2両（固定）','特急車・その他'];
function evidenceList(item){
 const list=el('ul',undefined,'evidence');
 for(const evidence of item.evidence||[]){const li=el('li'),badge=el('span',evidence.source==='hub'?'運用Hub':'列車ログ','source'+(evidence.source==='log'?' log':''));li.append(badge);
  if(evidence.source==='hub'&&evidence.url){const a=el('a',evidence.label);a.href=evidence.url;a.target='_blank';a.rel='noopener';li.append(a);}else{li.append(document.createTextNode(evidence.label));if(evidence.trainNumber){const button=el('button','ログを見る');button.type='button';button.onclick=()=>{$('date').value=evidence.serviceDate||'';$('group').value=evidence.groupName||'';$('query').value=evidence.trainNumber;showView('log');void load();};li.append(' ',button);}}
  list.append(li);
 }return list;
}
function fleetTable(label,items){
 const section=el('section',undefined,'fleet-group');section.append(el('h2',`${label}　${items.length}編成`));const wrap=el('div',undefined,'table-wrap'),table=el('table'),head=el('thead'),hr=el('tr');for(const h of ['','編成','現在の判定','根拠'])hr.append(el('th',h));head.append(hr);table.append(head);const body=el('tbody');
 if(!items.length){const row=el('tr'),cell=el('td','該当する編成はありません','empty-row');cell.colSpan=4;row.append(cell);body.append(row);}
 items.forEach((item,index)=>{const row=el('tr',undefined,'fleet-row '+item.kind),number=el('td',String(index+1),'fleet-number');number.dataset.label='番号';row.append(number);const name=el('td');name.dataset.label='編成';const link=(item.evidence||[]).find(x=>x.source==='hub'&&x.url);if(link){const a=el('a',item.formation,'fleet-name');a.href=link.url;a.target='_blank';a.rel='noopener';name.append(a);}else name.append(el('span',item.formation,'fleet-name'));if(item.seriesName)name.append(el('div',item.seriesName,'fleet-note'));row.append(name);const current=el('td');current.dataset.label='現在の判定';current.append(el('span',item.source==='hub'?'運用Hub':'ログから推定','source'+(item.source==='log'?' log':'')),el('div',item.status));if(item.updatedAt)current.append(el('div','更新：'+time(item.updatedAt),'fleet-note'));row.append(current);const evidence=el('td');evidence.dataset.label='根拠';evidence.append(evidenceList(item));row.append(evidence);body.append(row);});
 table.append(body);wrap.append(table);section.append(wrap);return section;
}
async function loadFleet(force=false){const button=$('refreshFleet');button.disabled=true;$('error').textContent='';try{const data=await api('/api/fleet-status',{method:force?'POST':'GET'}),groups=new Map();for(const item of data.items||[]){if(!groups.has(item.category))groups.set(item.category,[]);groups.get(item.category).push(item);}const order=[...categoryOrder,...[...groups.keys()].filter(x=>!categoryOrder.includes(x)).sort((a,b)=>a.localeCompare(b,'ja'))];$('fleetTables').replaceChildren(...order.map(group=>fleetTable(group,groups.get(group)||[])));$('fleetSummary').replaceChildren(el('span',`掲載 ${data.items?.length||0}編成`),el('span',`Hub確認 ${time(data.fetchedAt)}`));fleetLoaded=true;}catch(e){error(e);}finally{button.disabled=false;}}
async function open(){
 $('loginPanel').hidden=true;$('main').hidden=false;
 const view=location.hash==='#fleet'?'fleet':'log';
 showView(view);
}
$('login').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const d=await api('/api/auth/logs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('password').value})});token=d.token;sessionStorage.setItem(KEY,token);$('password').value='';await open();}catch(e){error(e);}finally{b.disabled=false;}};
$('filters').onsubmit=e=>{e.preventDefault();void load();};$('more').onclick=()=>load(false);
document.querySelectorAll('[data-log-view]').forEach(button=>button.onclick=()=>showView(button.dataset.logView));$('refreshFleet').onclick=()=>loadFleet(true);
window.addEventListener('hashchange',()=>{
 if(token)showView(location.hash==='#fleet'?'fleet':'log');
});
$('logout').onclick=()=>{token='';sessionStorage.removeItem(KEY);$('main').hidden=true;$('loginPanel').hidden=false;};
$('export').onclick=async()=>{const button=$('export');button.disabled=true;try{let cursor=null,items=[];do{const query=new URLSearchParams(params);if(cursor)query.set('before',cursor);const data=await api('/api/logs?'+query);items.push(...data.items);cursor=data.next;}while(cursor);for(const e of items)e.observations=await allHistory(e.id);const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),filters:Object.fromEntries(params),items},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=el('a');a.href=u;a.download='nankai-train-log.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){error(e);}finally{button.disabled=false;}};
setInterval(()=>{if(token&&!document.hidden)void status();},30000);
if(token)void open();
