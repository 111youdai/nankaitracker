const LOGIN_URL='https://top.swim.mlit.go.jp/swim/webapi/login';
const ATIS_URL='https://web.swim.mlit.go.jp/f2atrq/web/FLV402001';
const CACHE_TTL_MS=60_000;
const TIMEOUT_MS=15_000;

export const SWIM_AIRPORTS=Object.freeze({
 RJBB:{name:'関西国際空港',short:'KIX'},
 RJOO:{name:'大阪国際空港',short:'ITM'},
 RJAA:{name:'成田国際空港',short:'NRT'},
 RJTT:{name:'東京国際空港',short:'HND'}
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

export function parseAtisText(text){
 const clean=String(text||'').replace(/\r\n?/g,'\n').trim();
 const information=clean.match(/\b(?:INFORMATION|INFO)\s+([A-Z]+)\b/i)?.[1]?.toUpperCase()||null;
 const issueTime=clean.match(/\b(\d{4})Z\b/i)?.[1]||null;
 const arrivalRunways=runwayList(clean,[
  /\b(?:ARRIVAL|LANDING|LDG)\s+(?:RUNWAYS?|RWYS?)(?:\s+IN\s+USE)?\s*[:\-]?\s*((?:\d{2}[LCR]?)(?:\s*(?:,|\/|AND|&|\s)\s*\d{2}[LCR]?)*)/i
 ]);
 const departureRunways=runwayList(clean,[
  /\b(?:DEPARTURE|DEP|TAKEOFF|TAKE-OFF|TKOF)\s+(?:RUNWAYS?|RWYS?)(?:\s+IN\s+USE)?\s*[:\-]?\s*((?:\d{2}[LCR]?)(?:\s*(?:,|\/|AND|&|\s)\s*\d{2}[LCR]?)*)/i
 ]);
 const runways=runwayList(clean,[
  /\b(?:RUNWAYS?|RWYS?)\s+IN\s+USE\s*[:\-]?\s*((?:\d{2}[LCR]?)(?:\s*(?:,|\/|AND|&|\s)\s*\d{2}[LCR]?)*)/i
 ]);
 return {information,issueTime,arrivalRunways,departureRunways,runways,text:clean};
}

function normalize(payload,requested,fetchedAt){
 const records=rawEntries(payload),items=[];
 for(const code of requested){
  const record=[...records].reverse().find(entry=>entry.location===code)||null;
  items.push({airport:code,...SWIM_AIRPORTS[code],available:!!record,...(record?parseAtisText(record.text):{information:null,issueTime:null,arrivalRunways:[],departureRunways:[],runways:[],text:null})});
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
