import test from 'node:test';
import assert from 'node:assert/strict';
import stations from '../stations.cjs';
import core from '../core.cjs';
import {SPECIAL_TRAIN_PATTERNS} from '../../special-patterns.mjs';

test('9183 belongs to the same temporary transfer group as 9185',()=>{
 assert.equal(core.specialService('9183').category,core.specialService('9185').category);
 assert.ok(SPECIAL_TRAIN_PATTERNS.find(p=>p.trains.includes('9185')).trains.includes('9183'));
});
test('8376 initial approach does not reverse or truncate the timetable',()=>{
 const samples=[[118,78],[118,null],[117,77],[116,76],[115,null],[114,null],[113,null],[112,null],[110,null],[109,null],[108,null],[107,null],[106,66]];
 const rows=samples.map(([station_id,next_station_id],i)=>({source_time:new Date(Date.UTC(2026,10,12,4,37+i*2)).toISOString(),payload:{station_id,next_station_id,direction:'up'}}));
 const result=stations.observedTimeline(rows);
 assert.ok(result.available);
 assert.equal(result.points[0].station,'千代田');
 assert.equal(result.points.at(-1).station,'堺東');
 assert.equal(result.points.length,13);
 assert.ok(result.points.every((p,i,a)=>!i||p.time>=a[i-1].time));
});
