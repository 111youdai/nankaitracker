'use strict';
const core=require('./core.cjs');

const STATUS_WORDS=/入場|留置|休止|離脱|工場|検車区|廃車|転属|運用中/;
const GROUP_LABELS=Object.freeze({nankai:'南海線系統',koya:'高野線・泉北線系統'});

function statusKind(text=''){
 if(/廃車|転属|編成解除/.test(text))return 'transfer';
 if(/出場/.test(text))return 'out';
 if(/入場|工場/.test(text))return 'works';
 if(/休止|留置|離脱/.test(text))return 'inactive';
 return 'check';
}
function category(item){
 const number=Number(String(item.formation||'').replace(/\D/g,''));
 if(number>=10000||/天空|特急/.test(`${item.status||''} ${item.hubStatus||''}`))return '特急車・その他';
 if([6,4,2].includes(Number(item.cars)))return `${item.cars}両（固定）`;
 return item.cars?`${item.cars}両・その他`:'両数未確認';
}
function buildHubFleet(overviewsByGroup,formationsByGroup,fetchedAt){
 const byFormation=new Map();
 for(const group of ['nankai','koya']){
  const overviews=overviewsByGroup[group]||{},formations=formationsByGroup[group]?.formations||{};
  for(const [formation,overview] of Object.entries(overviews)){
   const caption=String(overview?.caption||'').trim(),unavailable=Number(overview?.unavailable)===1;
   if(!unavailable&&!STATUS_WORDS.test(caption))continue;
   const detail=formations[formation]||{},status=caption||'運用離脱中',sourceUrl=`https://unyohub.2pd.jp/railroad_${group}/formations/${encodeURIComponent(formation)}/`;
   let item=byFormation.get(formation);
   if(!item){item={formation,cars:Array.isArray(detail.cars)?detail.cars.length:null,seriesName:detail.series_name||null,groups:[],hubEntries:[]};byFormation.set(formation,item);}
   if(!item.cars&&Array.isArray(detail.cars))item.cars=detail.cars.length;
   if(!item.seriesName&&detail.series_name)item.seriesName=detail.series_name;
   item.groups.push(group);item.hubEntries.push({group,groupLabel:GROUP_LABELS[group],status,unavailable,sourceUrl});
  }
 }
 return {fetchedAt,items:[...byFormation.values()]};
}
function cleanPlace(text=''){return String(text).replace(/（(?:停車中|走行中)）/g,'').trim();}
function formationParts(formation){
 if(!formation?.verified)return [];
 return (formation.numbers||[]).map((n,index)=>({formation:`${Number(n)}F`,cars:Number(formation.counts?.[index]||0)})).filter(x=>/^\d+F$/.test(x.formation)&&x.formation!=='0F'&&x.cars>0);
}
function logKind(event){
 const special=event.special||core.specialService(event.trainNumber,event.serviceDate);
 if(special?.category==='chiyoda-entry'||event.lastPosition?.text==='千代田工場')return 'entry';
 if(special?.category==='chiyoda-test'||event.firstPosition?.text==='千代田工場')return 'exit';
 if(special?.category==='scrap-transfer')return 'transfer';
 if(special)return 'special';
 return 'generic';
}
function evidenceLabel(event){
 const route=[cleanPlace(event.firstPosition?.text),cleanPlace(event.lastPosition?.text)].filter(Boolean).join(' → ');
 return `${event.serviceDate} ${event.trainNumber}レ${route?` （${route}）`:''}`;
}
function inferLogStatus(events){
 const ordered=[...events].sort((a,b)=>String(a.lastSeen).localeCompare(String(b.lastSeen))),latest=ordered.at(-1);
 const movements=ordered.filter(e=>logKind(e)!=='generic'),movement=movements.at(-1),kind=movement?logKind(movement):'generic';
 if(kind==='entry')return {text:`千代田工場への入場を${movement.trainNumber}レで確認`,kind:'works',strong:true,updatedAt:movement.lastSeen};
 if(kind==='exit'){
  const later=String(latest.lastSeen)>String(movement.lastSeen)?`。最新は${latest.trainNumber}レ・${cleanPlace(latest.lastPosition?.text)}まで確認`:`。最終は${cleanPlace(movement.lastPosition?.text)}まで確認`;
  return {text:`千代田工場からの出場を${movement.trainNumber}レで確認${later}`,kind:'out',strong:true,updatedAt:latest.lastSeen};
 }
 if(kind==='transfer')return {text:`${movement.special?.label||'廃車回送'}を${movement.trainNumber}レで確認`,kind:'transfer',strong:true,updatedAt:movement.lastSeen};
 if(kind==='special')return {text:`${movement.special.label}を${movement.trainNumber}レで確認`,kind:statusKind(movement.special.label),strong:true,updatedAt:movement.lastSeen};
 return {text:`定期外候補 ${latest.trainNumber}レで${cleanPlace(latest.lastPosition?.text)||'最終位置不明'}まで確認`,kind:'check',strong:false,updatedAt:latest.lastSeen};
}
function mergeFleetStatus(snapshot={items:[]},events=[]){
 const table=new Map();
 for(const hub of snapshot.items||[]){
  const hubStatus=hub.hubEntries.map(x=>x.status).filter((v,i,a)=>a.indexOf(v)===i).join(' ／ ');
  table.set(hub.formation,{...hub,hubStatus,status:hubStatus,kind:statusKind(hubStatus),source:'hub',updatedAt:snapshot.fetchedAt,evidence:hub.hubEntries.map(x=>({source:'hub',label:`${x.groupLabel}：${x.status}`,url:x.sourceUrl}))});
 }
 const logMap=new Map();
 for(const event of events){for(const part of formationParts(event.formation)){if(!logMap.has(part.formation))logMap.set(part.formation,[]);logMap.get(part.formation).push({...event,cars:part.cars});}}
 for(const [formation,formationEvents] of logMap){
  const inferred=inferLogStatus(formationEvents),latest=[...formationEvents].sort((a,b)=>String(a.lastSeen).localeCompare(String(b.lastSeen))).at(-1),existing=table.get(formation);
  const logEvidence=[...formationEvents].sort((a,b)=>String(b.lastSeen).localeCompare(String(a.lastSeen))).slice(0,8).map(e=>({source:'log',label:evidenceLabel(e),eventId:e.id,trainNumber:e.trainNumber,serviceDate:e.serviceDate,groupName:e.groupName}));
  const useInference=inferred.strong||!existing;
  table.set(formation,{...(existing||{formation,groups:[latest.groupName],hubEntries:[],hubStatus:null,evidence:[]}),cars:existing?.cars||latest.cars,status:useInference?inferred.text:existing.status,kind:useInference?inferred.kind:existing.kind,source:useInference?'log':'hub',updatedAt:useInference?inferred.updatedAt:existing.updatedAt,evidence:[...logEvidence,...(existing?.evidence||[])]});
 }
 return {fetchedAt:snapshot.fetchedAt||null,items:[...table.values()].map(item=>({...item,category:category(item)})).sort((a,b)=>a.category.localeCompare(b.category,'ja')||a.formation.localeCompare(b.formation,'ja',{numeric:true}))};
}
module.exports={STATUS_WORDS,statusKind,category,buildHubFleet,mergeFleetStatus,formationParts,inferLogStatus};
