'use strict';
const $=id=>document.getElementById(id),KEY='nankaiTrackerCloudLogToken';
let token=sessionStorage.getItem(KEY)||'',next=null,params=new URLSearchParams(),busy=false;
const time=x=>x?new Date(x).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false}):'未確認';
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
async function api(url,options={}){
 const response=await fetch(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
 const data=await response.json();
 if(!response.ok){if(response.status===401){token='';sessionStorage.removeItem(KEY);$('loginPanel').hidden=false;$('main').hidden=true;}throw new Error(data.error||`HTTP ${response.status}`);}return data;
}
function error(e){$('error').textContent=e.message;}
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
function card(e){
 const known=e.special,a=el('article'),top=el('div',undefined,'top');top.append(el('h2',`${e.train_number} 列車`),el('span',known?.label||'定期外候補','tag'+(known?' known':'')));a.append(top);
 if(known){const box=el('div',undefined,'known-service');box.append(el('strong',known.label));if(known.route)box.append(el('div','区間：'+known.route));if(known.schedule)box.append(el('div','時刻：'+known.schedule));if(known.note)box.append(el('small',known.note));a.append(box);}
 const d=el('div',undefined,'details');const p=e.last_payload;
 for(const [k,v] of [['編成（最後に検証できた値）',e.formation.text],['運行日・系統',`${e.service_date} ／ ${e.group_name==='nankai'?'南海線系統':'高野線系統'}`],['初回 → 最終確認',`${time(e.first_seen)} → ${time(e.last_seen)}`],['最終位置（API駅ID）',`${p.station_id??'不明'} → ${p.next_station_id??'停車中'} ／ ${p.direction??'方向不明'}`]]){const c=el('div',k,'muted');c.append(el('b',v));d.append(c);}a.append(d);
 const button=el('button','確認履歴・元データ'),history=el('div',undefined,'history');history.hidden=true;a.append(button,history);
 button.onclick=async()=>{if(!history.hidden){history.hidden=true;return;}button.disabled=true;try{const data=await allHistory(e.id);history.replaceChildren(el('p',`確認履歴 ${data.length}件。位置・編成の変化は各時点の元データで確認できます。`));for(const o of data){const row=el('details');row.append(el('summary',`${time(o.source_time)} ／ 受信 ${time(o.observed_at)}`),el('pre',JSON.stringify(o.payload,null,2)));history.append(row);}const b=el('details');b.append(el('summary','照合した運用表'),el('pre',JSON.stringify(e.baseline,null,2)));history.append(b);history.hidden=false;}catch(e){error(e);}finally{button.disabled=false;}};
 return a;
}
async function load(reset=true){if(busy)return;busy=true;$('error').textContent='';try{
 if(reset){params=new URLSearchParams({date:$('date').value,group:$('group').value,q:$('query').value});next=null;}
 const query=new URLSearchParams(params);if(next)query.set('before',next);
 const data=await api('/api/logs?'+query);if(reset)$('events').replaceChildren();for(const e of data.items)$('events').append(card(e));
 if(reset&&!data.items.length)$('events').append(el('p','該当する記録はありません。監視開始前の履歴は取得できません。'));
 next=data.next;$('more').hidden=!next;await status();
 }catch(e){error(e);}finally{busy=false;}}
async function open(){ $('loginPanel').hidden=true;$('main').hidden=false;await load(); }
$('login').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const d=await api('/api/auth/logs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('password').value})});token=d.token;sessionStorage.setItem(KEY,token);$('password').value='';await open();}catch(e){error(e);}finally{b.disabled=false;}};
$('filters').onsubmit=e=>{e.preventDefault();void load();};$('more').onclick=()=>load(false);
$('logout').onclick=()=>{token='';sessionStorage.removeItem(KEY);$('main').hidden=true;$('loginPanel').hidden=false;};
$('export').onclick=async()=>{const button=$('export');button.disabled=true;try{let cursor=null,items=[];do{const query=new URLSearchParams(params);if(cursor)query.set('before',cursor);const data=await api('/api/logs?'+query);items.push(...data.items);cursor=data.next;}while(cursor);for(const e of items)e.observations=await allHistory(e.id);const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),filters:Object.fromEntries(params),items},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=el('a');a.href=u;a.download='nankai-train-log.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){error(e);}finally{button.disabled=false;}};
setInterval(()=>{if(token&&!document.hidden)void status();},30000);
if(token)void open();
