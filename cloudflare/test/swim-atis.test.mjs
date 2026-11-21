import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {fetchAtis,parseAtisText,requestedAirports} from '../swim-atis.mjs';
import {handle} from '../worker.mjs';
import {issueAccountToken} from '../accounts.mjs';

function database(){
 const raw=new DatabaseSync(':memory:');raw.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
 return {raw,prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return raw.prepare(sql).get(...this.args)||null;},async all(){return {results:raw.prepare(sql).all(...this.args)};},async run(){const result=raw.prepare(sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes)}};}};}};
}

function swimRequest(calls,{fail=false}={}){
 return async (url,options={})=>{
  calls.push({url:String(url),options});
  if(String(url).includes('/login')){
   const headers=new Headers();headers.append('Set-Cookie','MSMSI=session-secret; Path=/; Secure');headers.append('Set-Cookie','MSMAI=account-secret; Path=/; Secure');
   return new Response('{}',{status:200,headers});
  }
  if(fail)return new Response('unavailable',{status:503});
  return Response.json({error_info:[{error_code:'0',error_description:'normal'}],data:[
   {location:'RJBB',atisinfo:['RJBB ATIS INFORMATION BRAVO 1230Z ARRIVAL RUNWAY 24L DEPARTURE RUNWAY 24R']},
   {location:'RJOO',atisinfo:['RJOO ATIS INFORMATION CHARLIE 1231Z WEATHER CALM']}
  ]});
 };
}

test('ATIS本文から明示された情報だけを抽出する',()=>{
 const parsed=parseAtisText('INFORMATION DELTA 0915Z ARRIVAL RWY 34L DEPARTURE RWY 34R');
 assert.equal(parsed.information,'DELTA');assert.equal(parsed.issueTime,'0915');
 assert.deepEqual(parsed.arrivalRunways,['34L']);assert.deepEqual(parsed.departureRunways,['34R']);
 const abbreviated=parseAtisText('ATIS RJBB X M0830 (APCH)ILS Z RWY24L LDG RWY 24L DEP RWY 24R 30017KT 50KM Q1021/A3017');
 assert.equal(abbreviated.information,'X');assert.equal(abbreviated.issueTime,'0830');
 assert.deepEqual(abbreviated.arrivalRunways,['24L']);assert.deepEqual(abbreviated.departureRunways,['24R']);
 assert.equal(abbreviated.windRaw,'30017KT');assert.equal(abbreviated.visibilityRaw,'50KM');
 assert.equal(abbreviated.qnh,'1021');assert.equal(abbreviated.altimeter,'3017');
 const itami=parseAtisText('ATIS RJOO I M0600 (APCH)RNP RWY32L USING RWY 32L/32R KANSAI DEP FREQ 119.5, OSAKA TWR FREQ 118.1');
 assert.equal(itami.information,'I');assert.deepEqual(itami.runways,['32L','32R']);
 assert.deepEqual(itami.frequencies,[
  {type:'departure',label:'出発管制',frequency:'119.5'},
  {type:'tower',label:'タワー',frequency:'118.1'}
 ]);
 assert.equal(itami.issueTime,'0600');
 const unknown=parseAtisText('INFORMATION ECHO 0920Z WIND 250 DEGREES 12 KNOTS');
 assert.deepEqual(unknown.runways,[]);assert.deepEqual(unknown.arrivalRunways,[]);assert.deepEqual(unknown.departureRunways,[]);
 assert.deepEqual(requestedAirports('RJBB,RJTT'),['RJBB','RJTT']);assert.equal(requestedAirports('XXXX'),null);
 assert.deepEqual(requestedAirports('RJBE,RJCC,ROAH'),['RJBE','RJCC','ROAH']);
});

test('SWIM認証情報を返さず、60秒以内はAPIへ再接続しない',async()=>{
 const db=database(),calls=[];try{
  const env={SWIM_ID:'private-id',SWIM_PASSWORD:'private-password'};
  const first=await fetchAtis(db,env,['RJBB','RJOO'],{request:swimRequest(calls),now:new Date('2026-11-21T12:00:00Z')});
  const second=await fetchAtis(db,env,['RJBB','RJOO'],{request:swimRequest(calls),now:new Date('2026-11-21T12:00:30Z')});
  assert.equal(calls.length,2);assert.equal(second.cached,true);assert.equal(first.items[0].information,'BRAVO');
  assert.equal(JSON.stringify(first).includes('private-id'),false);assert.equal(JSON.stringify(first).includes('private-password'),false);
  assert.deepEqual(first.items[0].arrivalRunways,['24L']);assert.deepEqual(first.items[0].departureRunways,['24R']);
 }finally{db.raw.close();}
});

test('期限切れキャッシュは取得失敗時に現在情報として返さない',async()=>{
 const db=database();try{
  const env={SWIM_ID:'id',SWIM_PASSWORD:'password'},calls=[];
  await fetchAtis(db,env,['RJBB'],{request:swimRequest(calls),now:new Date('2026-11-21T12:00:00Z')});
  await assert.rejects(fetchAtis(db,env,['RJBB'],{request:swimRequest(calls,{fail:true}),now:new Date('2026-11-21T12:02:00Z')}),/取得できません/);
 }finally{db.raw.close();}
});

test('SWIMのHTTP 200業務エラー配列を失敗として扱う',async()=>{
 const db=database();try{
  const request=async(url)=>{
   if(String(url).includes('/login')){const headers=new Headers({'Set-Cookie':'MSMSI=a; Path=/, MSMAI=b; Path=/'});return new Response('{}',{headers});}
   return Response.json({error_info:[{error_code:'4',error_description:'location not found'}]});
  };
  await assert.rejects(fetchAtis(db,{SWIM_ID:'id',SWIM_PASSWORD:'password'},['RJBB'],{request}),/location not found/);
 }finally{db.raw.close();}
});

async function userToken(db,secret,role='owner'){
 const email=`${role}@example.com`,now='2026-11-21T00:00:00Z';
 await db.prepare('INSERT INTO users(email,display_name,password_salt,password_hash,password_iterations,role,access_level,status,created_at,approved_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(email,role,'AA','AA',1,role,role==='owner'?'records':'position','approved',now,now).run();
 const user=await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
 return issueAccountToken(user,secret);
}

test('航空情報APIは管理者だけが利用でき、未設定時は503を返す',async()=>{
 const db=database(),secret='account-secret-long-enough';try{
  const owner=await userToken(db,secret,'owner'),member=await userToken(db,secret,'member'),url='https://example.com/api/aviation/atis?airport=RJBB';
  const base={DB:db,ACCOUNT_SESSION_SECRET:secret};
  assert.equal((await handle(new Request(url),base)).status,401);
  assert.equal((await handle(new Request(url,{headers:{Authorization:`Bearer ${member}`}}),base)).status,403);
  const response=await handle(new Request(url,{headers:{Authorization:`Bearer ${owner}`}}),base),body=await response.json();
  assert.equal(response.status,503);assert.equal(body.code,'SWIM_NOT_CONFIGURED');
 }finally{db.raw.close();}
});
