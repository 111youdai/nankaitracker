import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIAL_TRAIN_PATTERNS,combinePatterns} from '../../special-patterns.mjs';

test('既知の特別スジに列番・区間・確認済み時刻を掲載する',()=>{
 const byTrain=number=>SPECIAL_TRAIN_PATTERNS.find(pattern=>pattern.trains.includes(number));
 assert.equal(byTrain('9185').category,'臨時回送');
 assert.equal(byTrain('8680').schedules[0].stops.at(-1),'千代田 17:24着');
 assert.equal(byTrain('8722').schedules[0].stops[0],'なんば 14:14発');
 assert.match(byTrain('8450').chain,/8450列車 → 8673列車/);
 assert.deepEqual(byTrain('8070').schedules[0].stops,['住ノ江 10:40発','なんば 10:52着','なんば 10:58発','千代田 11:34着']);
});

test('運転例を日付・列番ごとに保持し、未掲載列番も自動追加する',()=>{
 const sample=(id,number,date)=>({id,trainNumber:number,group:'koya',firstSeen:date+'T11:51:00Z',serviceDate:date,range:{text:'千代田 → 小原田'}});
 const entries=combinePatterns([sample(1,'9185','2026-11-02'),sample(2,'9185','2026-11-09'),sample(3,'9474','2026-10-29'),sample(4,'0088','2026-11-09')]);
 assert.deepEqual(entries.find(x=>x.pattern.trains.includes('9185')).samples.map(x=>x.id),[2,1]);
 assert.equal(entries.find(x=>x.pattern.trains.includes('9474')).samples[0].id,3);
 assert.ok(!entries.some(x=>x.pattern.trains.includes('0088')));
});
