import core from './core.cjs';
import stations from './stations.cjs';

export function scheduleSnapshot(detail,now){
 if(!Array.isArray(detail?.station_infos)||detail.result==='NG')throw Error('時刻表がありません');
 const valid=t=>typeof t==='string'&&/^(?:[01]\d|2\d):[0-5]\d$/.test(t);
 const stops=detail.station_infos.filter(s=>s.station_name&&(valid(s.arrival_time)||valid(s.departure_time))).map(s=>({station:s.station_name,arrival:valid(s.arrival_time)?s.arrival_time:null,departure:valid(s.departure_time)?s.departure_time:null}));
 if(!stops.length)throw Error('時刻がありません');
 return {fetchedAt:now.toISOString(),source:'南海アプリ',departure:detail.departure_station_name||null,arrival:detail.arrival_station_name||null,stops};
}

// At most two remote reads and two writes per cron, without changing observations.
export async function captureSchedules(db,now,request=fetch){
 const rows=(await db.prepare(`SELECT e.*,m.value AS saved_schedule FROM events e LEFT JOIN meta m ON m.key='schedule:'||e.id WHERE e.service_date=? ORDER BY e.last_seen DESC LIMIT 100`).bind(core.serviceDate(now)).all()).results;
 const candidates=rows.filter(e=>{const s=e.saved_schedule?JSON.parse(e.saved_schedule):null;return !s||(!s.stops?.length&&now-Date.parse(s.fetchedAt)>600000);}).slice(0,2);
 for(const event of candidates){
  let value;
  try{
   const baseTime=new Date(event.first_seen).toLocaleTimeString('en-GB',{timeZone:'Asia/Tokyo',hour12:false});
   const params=new URLSearchParams({train_number:event.train_number,dia_kind:event.group_name==='nankai'?'1':'2',interface_no:'1',base_time:baseTime});
   const response=await request('https://api-service.nankaiapp.com/api/v1/diagram/train?'+params,{signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('取得失敗');
   value=scheduleSnapshot(await response.json(),now);
  }catch{value={fetchedAt:now.toISOString(),stops:[],error:'公式時刻取得待ち'};}
  await db.prepare('INSERT OR REPLACE INTO meta(key,value) VALUES (?,?)').bind('schedule:'+event.id,JSON.stringify(value)).run();
 }
}

export function schedulePoints(schedule,day){
 if(!schedule?.stops?.length)return [];
 const dateTime=value=>{if(!value)return null;const [h,m]=value.split(':').map(Number);return new Date(Date.parse(day+'T00:00:00+09:00')+((h<4?h+24:h)*60+m)*60000).toISOString();};
 return schedule.stops.map(s=>({station:s.station,time:dateTime(s.arrival||s.departure),endTime:s.arrival&&s.departure?dateTime(s.departure):null,kind:'official',note:'南海アプリの公式予定時刻（到着・出発の実測ではありません）'}));
}

const depots=[{id:118,name:'千代田車庫',group:'koya'},{id:29,name:'羽倉崎検車区',group:'nankai'},{id:7,name:'住ノ江検車区',group:'nankai'}];
export function inferredDepot(event,payload,side,timeline){
 const route=stations.DISTANCE_ROUTES.find(r=>r.key===event.group_name),id=Number(payload?.station_id),step=payload?.direction==='up'?-1:payload?.direction==='down'?1:0;
 if(!route||!step||route.km[id]==null)return null;
 const depot=depots.find(d=>d.group===event.group_name&&Math.abs(route.km[id]-route.km[d.id])<=2.5&&((side==='first'?step:-step)*(route.km[id]-route.km[d.id])>=0));
 if(!depot)return null;
 const km=Math.abs(route.km[id]-route.km[depot.id]),speed=Math.max(20,Math.min(80,timeline?.averageSpeedKmh||40));
 const base=Date.parse(side==='first'?event.first_seen:event.last_seen);
 const time=new Date(Math.round((base+(side==='first'?-1:1)*km/speed*3600000)/60000)*60000).toISOString();
 const special=core.specialService(event.train_number,event.service_date);
 const name=depot.id===118&&['chiyoda-test','chiyoda-entry','scrap-transfer'].includes(special?.category)?'千代田工場':depot.name;
 return {station:name,stationId:depot.id,time,kind:'estimated',facility:true,note:`最${side==='first'?'初':'後'}の在線位置・方向・車庫までの営業キロから推定。車庫内の移動時間は不明です。`};
}

export function enrichedTimeline(event,rows,schedule,base){
 const points=[...(base?.points||[])],official=schedulePoints(schedule,event.service_date);
 // Published times supplement missing stations; observed times remain observations.
 for(const point of official){const index=points.findIndex(p=>p.station===point.station);if(index<0)points.push(point);else if(points[index].kind!=='observed')points[index]=point;else points[index]={...points[index],note:`南海アプリ公式予定 ${schedule.stops.find(s=>s.station===point.station)?.arrival||''} / 在線で確認した時刻を表示`};}
 for(const side of ['first','last']){
  const payload=side==='first'?rows[0]?.payload:rows.at(-1)?.payload;
  const terminal=side==='first'?schedule?.departure:schedule?.arrival;
  const depot=inferredDepot(event,payload,side,base);
  if(depot&&(!terminal||terminal===stations.stationName(depot.stationId))&&!points.some(p=>p.station===depot.station))points.push(depot);
 }
 points.sort((a,b)=>Date.parse(a.time||event.service_date+'T'+a.timeLabel+':00+09:00')-Date.parse(b.time||event.service_date+'T'+b.timeLabel+':00+09:00'));
 return {...base,available:points.length>0,points,note:[base?.note,'公式予定は南海アプリ配信値、車庫の時刻は位置・方向・距離からの推定です。'].filter(Boolean).join(' ')};
}
