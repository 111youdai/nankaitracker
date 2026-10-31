'use strict';
// Japanese station names from the Nankai app line feed. Branch junction aliases
// match the placement aliases used by the existing tracker UI.
const STATION_NAMES=Object.freeze({
  1:'なんば',2:'新今宮',3:'天下茶屋',4:'岸里玉出',5:'粉浜',6:'住吉大社',7:'住ノ江',8:'七道',9:'堺',10:'湊',11:'石津川',12:'諏訪ノ森',13:'浜寺公園',14:'羽衣',15:'高石',16:'北助松',17:'松ノ浜',18:'泉大津',19:'忠岡',20:'春木',21:'和泉大宮',22:'岸和田',23:'蛸地蔵',24:'貝塚',25:'二色浜',26:'鶴原',27:'井原里',28:'泉佐野',29:'羽倉崎',30:'吉見ノ里',31:'岡田浦',32:'樽井',33:'尾崎',34:'鳥取ノ荘',35:'箱作',36:'淡輪',37:'みさき公園',38:'孝子',39:'和歌山大学前',40:'紀ノ川',41:'和歌山市',42:'和歌山港',
  61:'羽衣',62:'伽羅橋',63:'高師浜',75:'泉佐野',76:'りんくうタウン',77:'関西空港',81:'多奈川',82:'深日港',83:'深日町',84:'みさき公園',87:'紀ノ川',88:'東松江',89:'中松江',90:'八幡前',91:'西ノ庄',92:'二里ケ浜',93:'磯ノ浦',94:'加太',
  95:'なんば',96:'今宮戎',97:'新今宮',98:'萩ノ茶屋',99:'天下茶屋',100:'岸里玉出',101:'帝塚山',102:'住吉東',103:'沢ノ町',104:'我孫子前',105:'浅香山',106:'堺東',107:'三国ケ丘',108:'百舌鳥八幡',109:'中百舌鳥',110:'白鷺',111:'初芝',112:'萩原天神',113:'北野田',114:'狭山',115:'大阪狭山市',116:'金剛',117:'滝谷',118:'千代田',119:'河内長野',120:'三日市町',121:'美加の台',122:'千早口',123:'天見',124:'紀見峠',125:'林間田園都市',126:'御幸辻',127:'橋本',128:'紀伊清水',129:'学文路',130:'九度山',131:'高野下',132:'下古沢',133:'上古沢',134:'紀伊細川',135:'紀伊神谷',136:'極楽橋',
  137:'汐見橋',138:'芦原町',139:'木津川',140:'津守',141:'西天下茶屋',142:'岸里玉出',151:'中百舌鳥',152:'深井',153:'泉ケ丘',154:'栂・美木多',155:'光明池',156:'和泉中央'
});
const range=(from,to)=>Array.from({length:to-from+1},(_,i)=>from+i);
// Routes are used only to reject impossible cross-line pairs and to infer a
// neighbouring station from the observations immediately before/after it.
const ROUTES=Object.freeze([
 Object.freeze(range(1,41)),Object.freeze([41,42]),Object.freeze([61,62,63]),
 Object.freeze([75,76,77]),Object.freeze([84,83,82,81]),Object.freeze(range(87,94)),
 Object.freeze(range(95,136)),Object.freeze(range(151,156)),Object.freeze(range(137,142))
]);
const KOYA_ROUTES=Object.freeze([ROUTES[6],ROUTES[7]]);
// Cumulative operating kilometres. The app feed omits Ima-miya-ebisu and
// Haginochaya from the Nankai-main IDs, while the Koya IDs contain them.
const MAIN_KM=Object.freeze([0,0,1.4,3,3.9,5.1,5.7,6.7,8.2,9.8,11.2,12.7,13.8,14.8,15.5,17.4,18.5,19.5,20.4,22.3,23.7,25,26,26.9,28.6,30.4,31.3,32.4,34,36.1,37.4,38.8,40.6,43.1,44.6,46.6,50.2,51.9,56.3,58,61.6,64.2]);
const KOYA_KM=Object.freeze([0,0.9,1.4,2,3,3.9,5,5.9,6.8,7.4,8.7,10.3,11.8,12.7,13.4,14.1,15.1,16.6,17.5,19.3,20.2,21.8,22.9,24.6,25.9,28,29.7,31.3,33.2,34.9,38.6,39.9,41.9,44.7,47.8,50.4,52.2,54.2,55.9,57.6,60.6,63,64.5]);
const DISTANCE_ROUTES=Object.freeze([
 Object.freeze({key:'nankai',name:'南海本線',stations:ROUTES[0],km:Object.freeze(Object.fromEntries(ROUTES[0].map((id,index)=>[id,MAIN_KM[index+1]])))}),
 Object.freeze({key:'koya',name:'高野線',stations:ROUTES[6],km:Object.freeze(Object.fromEntries(ROUTES[6].map((id,index)=>[id,KOYA_KM[index]])))})
]);
function stationName(value){const id=Number(value);return Number.isInteger(id)?STATION_NAMES[id]||null:null;}
function stationLabel(value){const name=stationName(value);return name?`${name}駅`:null;}
function routeContaining(id,routes=ROUTES){const n=Number(id);return routes.find(route=>route.includes(n))||null;}
function routeIndex(payload,routes=ROUTES){const route=routeContaining(payload?.station_id,routes);return route?{route,index:route.indexOf(Number(payload.station_id))}:null;}
function adjacentOnRoute(a,b){const route=routeContaining(a);return !!route&&route.includes(Number(b))&&Math.abs(route.indexOf(Number(a))-route.indexOf(Number(b)))===1;}
function directionStep(direction){return String(direction||'').toLowerCase()==='up'?-1:String(direction||'').toLowerCase()==='down'?1:0;}
function sameRouteIndex(payload,route){const index=route.indexOf(Number(payload?.station_id));return index<0?null:index;}
function koyaInferredSegment(payload,previous,next){
 const found=routeIndex(payload,KOYA_ROUTES),step=directionStep(payload.direction);if(!found||!step)return null;
 const {route,index}=found,previousIndex=sameRouteIndex(previous,route),nextIndex=sameRouteIndex(next,route);
 let from=null,to=null;
 if(nextIndex===index+step){from=index;to=nextIndex;}
 else if(nextIndex===index){from=index-step;to=index;}
 else if(previousIndex===index-step){from=previousIndex;to=index;}
 else if(previousIndex===index){from=index;to=index+step;}
 if(from==null||to==null||!route[from]||!route[to])return null;
 return `${stationLabel(route[from])}～${stationLabel(route[to])}間（走行中）`;
}
function nextDifferent(payloads,index,direction=1){
 const id=Number(payloads[index]?.station_id);
 for(let i=index+direction;i>=0&&i<payloads.length;i+=direction){const candidate=payloads[i];if(Number(candidate?.station_id)!==id)return candidate;}
 return null;
}
function chiyodaWorks(payloads,index,{eventStart=false,eventEnd=false}={}){
 const payload=payloads[index],id=Number(payload?.station_id),marker=Number(payload?.next_station_id),direction=String(payload?.direction||'').toLowerCase();
 if(id!==118||marker!==78)return null;
 const next=nextDifferent(payloads,index,1),previous=nextDifferent(payloads,index,-1);
 if(eventStart&&index===0&&direction==='up'&&[116,117].includes(Number(next?.station_id)))return '千代田工場';
 if(eventEnd&&index===payloads.length-1&&direction==='down'&&[116,117].includes(Number(previous?.station_id)))return '千代田工場';
 return null;
}
function position(payload={},previous=null,nextPayload=null,works=null){
 const current=stationLabel(payload.station_id),hasNext=payload.next_station_id!=null&&payload.next_station_id!=='';
 const next=hasNext?stationLabel(payload.next_station_id):null,direction=String(payload.direction||'').toLowerCase();
 const directionLabel=direction==='up'?'上り':direction==='down'?'下り':'方向不明';
 let text='位置不明';
 let corrected=false,correction=null;
 if(works){text=works;corrected=true;correction='chiyoda-works';}
 else if(current&&hasNext&&next&&adjacentOnRoute(payload.station_id,payload.next_station_id))text=`${current}～${next}間（走行中）`;
 else if(current&&hasNext){const inferred=Number(payload.line_id)===2?koyaInferredSegment(payload,previous,nextPayload):null;text=inferred||`${current}付近（走行中）`;corrected=true;correction=inferred?'adjacent-stations':'invalid-next-station';}
 else if(!current&&next)text=`${next}手前（走行中）`;
 else if(current)text=`${current}（停車中）`;
 return {stationId:payload.station_id??null,nextStationId:payload.next_station_id??null,current,next,running:hasNext,direction,directionLabel,text,corrected,correction};
}
function trajectoryPositions(payloads=[],options={}){return payloads.map((payload,index)=>position(payload,payloads[index-1]||null,payloads[index+1]||null,chiyodaWorks(payloads,index,options)));}
function stationPosition(payload={}){return position(payload);}
function observedRange(first,last){const start=stationPosition(first),end=stationPosition(last);return {first:start,last:end,text:`初回：${start.text} ／ 最終：${end.text}`};}
function round(value,digits=1){const scale=10**digits;return Math.round(value*scale)/scale;}
function minute(value){const [hour,minutes]=String(value).split(':').map(Number);return hour*60+minutes;}
function minuteLabel(value){const minutes=((Math.round(value)%1440)+1440)%1440;return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function interpolatePath(stationIds,km,known){
 const distances=new Map([[stationIds[0],0]]);for(let index=1;index<stationIds.length;index++)distances.set(stationIds[index],distances.get(stationIds[index-1])+Math.abs(km[stationIds[index]]-km[stationIds[index-1]]));
 const anchors=Object.entries(known).map(([id,time])=>({id:Number(id),time:minute(time),distance:distances.get(Number(id))})).sort((a,b)=>stationIds.indexOf(a.id)-stationIds.indexOf(b.id));
 return stationIds.map(id=>{
  const exact=anchors.find(anchor=>anchor.id===id);if(exact)return {stationId:id,station:stationName(id),timeLabel:minuteLabel(exact.time),kind:'known'};
  const distance=distances.get(id);let left=null,right=null;
  for(const anchor of anchors){if(anchor.distance<distance)left=anchor;else if(anchor.distance>distance){right=anchor;break;}}
  if(!left||!right)return null;
  const time=left.time+(distance-left.distance)/(right.distance-left.distance)*(right.time-left.time);
  return {stationId:id,station:stationName(id),timeLabel:minuteLabel(time),kind:'estimated'};
 }).filter(Boolean);
}
function knownChiyodaEntry(trainNumber,serviceDate){
 if(!['8673','8070'].includes(String(trainNumber).normalize('NFKC').replace(/^0+/,'')))return null;
 const dow=/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)?new Date(`${serviceDate}T00:00:00Z`).getUTCDay():-1,weekend=dow===0||dow===6;
 if(weekend){
  const points=interpolatePath(ROUTES[6].slice(0,24),DISTANCE_ROUTES[1].km,{95:'10:43',118:'11:24'}).map(point=>({...point,line:'高野線'}));
  return {available:true,method:'known-distance',distanceKm:25.9,averageSpeedKmh:round(25.9/(41/60)),averageIncludesStops:true,points,note:'既知の始発・終着時刻と駅間の営業キロから、各駅の通過時刻を補間しています。'};
 }
 const outbound=interpolatePath([7,6,5,4,3,2,1],DISTANCE_ROUTES[0].km,{7:'10:40',1:'10:52'}).map(point=>({...point,line:'南海本線'}));
 const inbound=interpolatePath(ROUTES[6].slice(0,24),DISTANCE_ROUTES[1].km,{95:'10:58',99:'11:04',106:'11:12',107:'11:14',113:'11:20',116:'11:22',118:'11:34'}).map(point=>({...point,line:'高野線'}));
 outbound[outbound.length-1]={...outbound[outbound.length-1],endTimeLabel:'10:58',note:'10:52着・10:58発'};
 return {available:true,method:'known-distance',distanceKm:32.6,averageSpeedKmh:round(32.6/(48/60)),averageIncludesStops:false,points:[...outbound,...inbound.slice(1)],note:'既知時刻を固定し、その間の各駅は営業キロ比で補間しています。なんばでの6分間は平均速度から除外しています。'};
}
function distanceRoute(id){const value=Number(id);return DISTANCE_ROUTES.find(route=>route.stations.includes(value))||null;}
function observationCoordinate(payload){
 const route=distanceRoute(payload?.station_id);if(!route)return null;
 const id=Number(payload.station_id),index=route.stations.indexOf(id),running=payload.next_station_id!=null&&payload.next_station_id!=='';
 let value=route.km[id];
 if(running){const next=Number(payload.next_station_id),nextIndex=route.stations.indexOf(next),step=nextIndex>=0&&Math.abs(nextIndex-index)===1?nextIndex-index:directionStep(payload.direction),adjacent=route.stations[index+step];if(adjacent!=null)value=(value+route.km[adjacent])/2;}
 return {route,id,index,km:value,running};
}
function observedTimeline(rows=[]){
 const raw=rows.map(row=>{const coordinate=observationCoordinate(row.payload),time=Date.parse(row.source_time);return coordinate&&Number.isFinite(time)?{...coordinate,time,payload:row.payload}:null;}).filter(Boolean).sort((a,b)=>a.time-b.time);
 if(raw.length<2)return null;
 const counts=new Map();for(const item of raw)counts.set(item.route.key,(counts.get(item.route.key)||0)+1);
 const route=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0],same=raw.filter(item=>item.route.key===route);if(same.length<2)return null;
 const first=same[0],candidate=same.find(item=>Math.abs(item.km-first.km)>=0.2);if(!candidate)return null;
 const direction=Math.sign(candidate.km-first.km),anchors=[];
 for(const item of same){const previous=anchors.at(-1);if(!previous||direction*(item.km-previous.km)>=-0.25)anchors.push(item);}
 const last=anchors.at(-1),distance=Math.abs(last.km-first.km),hours=(last.time-first.time)/3600000;if(distance<0.2||hours<=0)return null;
 const speed=distance/hours;if(speed>160)return null;
 const progress=item=>direction*item.km,low=Math.min(first.km,last.km),high=Math.max(first.km,last.km),stationIds=first.route.stations.filter(id=>first.route.km[id]>=low-0.01&&first.route.km[id]<=high+0.01);if(direction<0)stationIds.reverse();
 const points=stationIds.map(id=>{
  const observed=anchors.filter(item=>!item.running&&item.id===id);if(observed.length)return {stationId:id,station:stationName(id),time:new Date(observed[0].time).toISOString(),endTime:observed.length>1?new Date(observed.at(-1).time).toISOString():null,kind:'observed',line:first.route.name};
  const target=direction*first.route.km[id];let left=null,right=null;for(const anchor of anchors){const value=progress(anchor);if(value<=target)left=anchor;if(value>=target){right=anchor;break;}}
  if(!left||!right||progress(right)-progress(left)<0.01)return null;
  const ratio=(target-progress(left))/(progress(right)-progress(left)),time=left.time+ratio*(right.time-left.time);
  return {stationId:id,station:stationName(id),time:new Date(time).toISOString(),kind:'estimated',line:first.route.name};
 }).filter(Boolean);
 return {available:true,method:'observations-distance',distanceKm:round(distance),averageSpeedKmh:round(speed),averageIncludesStops:true,points,note:'保存した在線時刻を固定点として、駅間の営業キロから通過時刻を補間しています。平均速度は停車時間を含む記録区間の値です。'};
}
function buildTimeline(rows=[],options={}){return knownChiyodaEntry(options.trainNumber,options.serviceDate)||observedTimeline(rows);}
module.exports={STATION_NAMES,ROUTES,DISTANCE_ROUTES,stationName,stationLabel,stationPosition,trajectoryPositions,observedRange,buildTimeline};
