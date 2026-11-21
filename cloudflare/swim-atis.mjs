const LOGIN_URL='https://top.swim.mlit.go.jp/swim/webapi/login';
const ATIS_URL='https://web.swim.mlit.go.jp/f2atrq/web/FLV402001';
const CACHE_TTL_MS=60_000;
const TIMEOUT_MS=15_000;

export const SWIM_AIRPORTS=Object.freeze({
 RJBB:{name:'関西国際空港',short:'KIX'},
 RJBE:{name:'神戸空港',short:'UKB'},
 RJOO:{name:'大阪国際空港',short:'ITM'},
 RJAA:{name:'成田国際空港',short:'NRT'},
 RJTT:{name:'東京国際空港',short:'HND'},
 RJCC:{name:'新千歳空港',short:'CTS'},
 RJCH:{name:'函館空港',short:'HKD'},
 RJSS:{name:'仙台空港',short:'SDJ'},
 RJSN:{name:'新潟空港',short:'KIJ'},
 RJGG:{name:'中部国際空港',short:'NGO'},
 RJOA:{name:'広島空港',short:'HIJ'},
 RJOT:{name:'高松空港',short:'TAK'},
 RJOM:{name:'松山空港',short:'MYJ'},
 RJOK:{name:'高知空港',short:'KCZ'},
 RJFF:{name:'福岡空港',short:'FUK'},
 RJFS:{name:'佐賀空港',short:'HSG'},
 RJFU:{name:'長崎空港',short:'NGS'},
 RJFT:{name:'熊本空港',short:'KMJ'},
 RJFO:{name:'大分空港',short:'OIT'},
 RJFM:{name:'宮崎空港',short:'KMI'},
 RJFK:{name:'鹿児島空港',short:'KOJ'},
 ROAH:{name:'那覇空港',short:'OKA'},
 ROIG:{name:'新石垣空港',short:'ISG'}
});

const asText=value=>typeof value==='string'?value.trim():'';
const firstText=(object,keys)=>keys.map(key=>asText(object?.[key])).find(Boolean)||null;

function cookieHeader(headers){
 const values=typeof headers.getSetCookie==='function'?headers.getSetCookie():[headers.get('set-cookie')||''];
 const cookies=[];
 for(const value of values){
  for(const match of String(value).matchAll(/(?:^|,\s*)(MSM(?:SI|AI))=([^;,\s]+)/g))cookies.push(`${match[1]}=${match[2]}`);
 }
 return [...new Set(cookies)].join('; ');
}

function atisError(payload){
 const source=payload?.error_info??payload?.errorInfo??[],items=Array.isArray(source)?source:[source];
 for(const info of items){
  const code=Number(info?.error_code??info?.errorCode??0);
  if(code===0||code===1)continue;
  return firstText(info,['error_description','error_message','message','detail'])||`SWIM APIエラー（${code}）`;
 }
 return null;
}

function textFrom(value){
 if(typeof value==='string')return value.trim();
 if(!value||typeof value!=='object')return '';
 return firstText(value,['atis_text','atisText','text','message','contents','content','atis'])||'';
}

function rawEntries(payload){
 const data=Array.isArray(payload?.data)?payload.data:(payload?.data?[payload.data]:[]),entries=[];
 for(const group of data){
  const location=asText(group?.location||group?.airport||group?.icao).toUpperCase();
  const source=group?.atisinfo??group?.atis_info??group?.atisInfo??group;
  for(const item of (Array.isArray(source)?source:[source])){
   const text=textFrom(item)||textFrom(group)||(typeof item==='string'?item.trim():'');
   if(text)entries.push({location,text,raw:item});
  }
 }
 return entries;
}

function runwayList(text,patterns){
 for(const pattern of patterns){
  const match=text.match(pattern);
  if(!match)continue;
  const values=[...match[1].toUpperCase().matchAll(/\b\d{2}[LCR]?\b/g)].map(item=>item[0]);
  if(values.length)return [...new Set(values)];
 }
 return [];
}

function frequencyList(text){
 const definitions=[
  ['departure','出発管制',/\b(?:DEP|DEPARTURE)\s+FREQ(?:UENCY)?\s*[:\-]?\s*(\d{3}(?:\.\d{1,3})?)\b/gi],
  ['approach','進入管制',/\b(?:APP|APCH|APPROACH|ARR|ARRIVAL)\s+FREQ(?:UENCY)?\s*[:\-]?\s*(\d{3}(?:\.\d{1,3})?)\b/gi],
  ['tower','タワー',/\b(?:TWR|TOWER)\s+FREQ(?:UENCY)?\s*[:\-]?\s*(\d{3}(?:\.\d{1,3})?)\b/gi],
  ['ground','グランド',/\b(?:GND|GROUND)\s+FREQ(?:UENCY)?\s*[:\-]?\s*(\d{3}(?:\.\d{1,3})?)\b/gi],
  ['clearance','クリアランス',/\b(?:CLR|CLNC(?:\s+DEL)?|CLEARANCE(?:\s+DELIVERY)?|DELIVERY|CD)\s+FREQ(?:UENCY)?\s*[:\-]?\s*(\d{3}(?:\.\d{1,3})?)\b/gi],
  ['atis','ATIS',/\bATIS\s+FREQ(?:UENCY)?\s*[:\-]?\s*(\d{3}(?:\.\d{1,3})?)\b/gi]
 ];
 const frequencies=[];
 for(const [type,label,pattern] of definitions){
  for(const match of text.matchAll(pattern)){
   const frequency=match[1];
   if(!frequencies.some(item=>item.type===type&&item.frequency===frequency))frequencies.push({type,label,frequency});
  }
 }
 return frequencies;
}

function weatherData(text){
 const windRaw=text.match(/\b((?:VRB|\d{3})\d{2,3}(?:G\d{2,3}(?:\/\d{2,3})?)?KT|CALM)\b/i)?.[1]?.toUpperCase()||null;
 const visibilityRaw=text.match(/\b(\d{1,3})KM\b/i)?.[0]?.toUpperCase()||null;
 const qnh=text.match(/\bQ(\d{4})\b/i)?.[1]||null;
 const altimeter=text.match(/\bA(\d{4})\b/i)?.[1]||null;
 return {windRaw,visibilityRaw,qnh,altimeter};
}

export function parseAtisText(text){
 const clean=String(text||'').replace(/\r\n?/g,'\n').trim();
 const information=(clean.match(/\b(?:INFORMATION|INFO)\s+([A-Z]+)\b/i)?.[1]||clean.match(/\bATIS\s+[A-Z]{4}\s+([A-Z])\b/i)?.[1])?.toUpperCase()||null;
 const issueTime=clean.match(/\bM(\d{4})\b/i)?.[1]||clean.match(/\b(\d{4})Z\b/i)?.[1]||null;
 const arrivalRunways=runwayList(clean,[
  /\b(?:ARRIVAL|LANDING|LDG)\s+(?:RUNWAYS?|RWYS?)(?:\s+IN\s+USE)?\s*[:\-]?\s*((?:\d{2}[LCR]?)(?:\s*(?:,|\/|AND|&)\s*\d{2}[LCR]?)*)/i
 ]);
 const departureRunways=runwayList(clean,[
  /\b(?:DEPARTURE|DEP|TAKEOFF|TAKE-OFF|TKOF)\s+(?:RUNWAYS?|RWYS?)(?:\s+IN\s+USE)?\s*[:\-]?\s*((?:\d{2}[LCR]?)(?:\s*(?:,|\/|AND|&)\s*\d{2}[LCR]?)*)/i
 ]);
 const runways=runwayList(clean,[
  /\b(?:RUNWAYS?|RWYS?)\s+IN\s+USE\s*[:\-]?\s*((?:\d{2}[LCR]?)(?:\s*(?:,|\/|AND|&)\s*\d{2}[LCR]?)*)/i,
  /\bUSING\s+(?:RUNWAYS?|RWYS?)\s*[:\-]?\s*((?:\d{2}[LCR]?)(?:\s*(?:,|\/|AND|&)\s*\d{2}[LCR]?)*)/i
 ]);
 const frequencies=frequencyList(clean);
 return {information,issueTime,arrivalRunways,departureRunways,runways,frequencies,...weatherData(clean),text:clean};
}

function normalize(payload,requested,fetchedAt){
 const records=rawEntries(payload),items=[];
 for(const code of requested){
  const record=[...records].reverse().find(entry=>entry.location===code)||null;
  items.push({airport:code,...SWIM_AIRPORTS[code],available:!!record,...(record?parseAtisText(record.text):{information:null,issueTime:null,arrivalRunways:[],departureRunways:[],runways:[],frequencies:[],windRaw:null,visibilityRaw:null,qnh:null,altimeter:null,text:null})});
 }
 return {fetchedAt,source:'SWIM portal',service:'S2005',apiId:'FLV402001',items};
}

async function cached(db,key){
 const row=await db.prepare('SELECT value FROM meta WHERE key=?').bind(key).first();
 if(!row)return null;
 try{return JSON.parse(row.value);}catch{return null;}
}

async function save(db,key,value){
 await db.prepare('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value)).run();
}

export function requestedAirports(value){
 const requested=[...new Set(String(value||'').toUpperCase().split(',').map(item=>item.trim()).filter(Boolean))];
 if(!requested.length||requested.length>4||requested.some(code=>!SWIM_AIRPORTS[code]))return null;
 return requested;
}

export async function fetchAtis(db,env,requested,{request=fetch,now=new Date()}={}){
 if(!env.SWIM_ID||!env.SWIM_PASSWORD)throw Object.assign(new Error('SWIM接続情報が未設定です'),{code:'SWIM_NOT_CONFIGURED',status:503});
 const key=`swim-atis:${[...requested].sort().join(',')}`,snapshot=await cached(db,key),age=snapshot?+now-Date.parse(snapshot.fetchedAt):Infinity;
 if(snapshot&&Number.isFinite(age)&&age>=0&&age<CACHE_TTL_MS)return {...snapshot,cached:true};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 try{
  const login=await request(LOGIN_URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id:env.SWIM_ID,password:env.SWIM_PASSWORD}),redirect:'manual',signal:controller.signal});
  if(!login.ok)throw new Error(`SWIM認証に失敗しました（HTTP ${login.status}）`);
  const cookie=cookieHeader(login.headers);
  if(!cookie.includes('MSMSI=')||!cookie.includes('MSMAI='))throw new Error('SWIM認証セッションを取得できませんでした');
  const url=new URL(ATIS_URL);url.searchParams.set('location',requested.join(','));url.searchParams.set('dispcnt','10');
  const response=await request(url,{headers:{Accept:'application/json',Cookie:cookie},signal:controller.signal});
  if(!response.ok)throw new Error(`ATIS情報を取得できません（HTTP ${response.status}）`);
  const payload=await response.json();
  const apiError=atisError(payload);if(apiError)throw new Error(apiError);
  const result=normalize(payload,requested,now.toISOString());
  await save(db,key,result);
  return {...result,cached:false};
 }catch(error){
  if(error?.name==='AbortError')throw Object.assign(new Error('SWIMとの通信がタイムアウトしました'),{status:504});
  throw error;
 }finally{clearTimeout(timer);}
}
