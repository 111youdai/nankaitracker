import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSchedules,scheduleSnapshot,enrichedTimeline,inferredDepot,schedulePoints} from '../record-schedules.mjs';
const now=new Date('2026-11-16T10:00:00Z');
const event={id:143,service_date:'2026-11-16',group_name:'nankai',train_number:'8871',first_seen:'2026-11-16T08:13:03Z',last_seen:'2026-11-16T09:51:04Z'};
const detail={departure_station_name:'なんば',arrival_station_name:'和歌山市',station_infos:[{station_name:'和歌山市',arrival_time:'18:52',departure_time:null}]};
test('公式終着時刻を補完しても最後の実測を到着に書き換えない',()=>{
 const rows=[{payload:{station_id:1,direction:'down'}},{payload:{station_id:40,direction:'down'}}];
 const base={available:true,distanceKm:60,averageSpeedKmh:40,points:[{station:'紀ノ川',time:'2026-11-16T09:50:00Z',kind:'observed'}]};
 const result=enrichedTimeline(event,rows,scheduleSnapshot(detail,now),base);
 assert.equal(result.points.at(-1).station,'和歌山市');
 assert.equal(result.points.at(-1).time,'2026-11-16T09:52:00.000Z');
 assert.equal(result.points.at(-1).kind,'official');
 assert.equal(result.points[0].kind,'observed');
 assert.equal(base.points.length,1);
});
test('千代田近隣の方向と距離から車庫を推定し、離れた駅や逆方向は対象外',()=>{
 const e={...event,group_name:'koya',train_number:'9991'};
 for(const [station_id,direction] of [[117,'up'],[119,'down']])assert.equal(inferredDepot(e,{station_id,direction},'first').station,'千代田車庫');
 assert.equal(inferredDepot(e,{station_id:117,direction:'down'},'first'),null);
 assert.equal(inferredDepot(e,{station_id:113,direction:'up'},'first'),null);
 assert.equal(inferredDepot(event,{station_id:30,direction:'down'},'first').station,'羽倉崎検車区');
 assert.equal(inferredDepot(event,{station_id:6,direction:'down'},'last').station,'住ノ江検車区');
 const official=scheduleSnapshot({...detail,departure_station_name:'北野田'},now);
 assert.ok(!enrichedTimeline(e,[{payload:{station_id:117,direction:'up'}}],official,null).points.some(p=>p.facility));
});
test('日付をまたぐ公式時刻は運行日の翌日に変換',()=>{
 assert.equal(schedulePoints({stops:[{station:'なんば',arrival:'01:14'}]},'2026-11-16')[0].time,'2026-11-16T16:14:00.000Z');
});
test('初回確認時刻で公式時刻を取得・永続化し、保存済みは再取得しない',async()=>{
 let saved=null,calls=0;
 const db={prepare(sql){return {bind(...args){this.args=args;return this;},async all(){assert.equal(this.args[0],'2026-11-16');return {results:[{...event,saved_schedule:saved}]};},async run(){assert.equal(this.args[0],'schedule:143');saved=this.args[1];}};}};
 const request=async url=>{calls++;assert.equal(new URL(url).searchParams.get('base_time'),'17:13:03');return Response.json(detail);};
 await captureSchedules(db,now,request);
 await captureSchedules(db,now,request);
 assert.equal(calls,1);assert.equal(JSON.parse(saved).stops[0].arrival,'18:52');
});
