import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIAL_TRAIN_PATTERNS} from '../../special-patterns.mjs';

test('既知の特別スジに列番・区間・確認済み時刻を掲載する',()=>{
 const byTrain=number=>SPECIAL_TRAIN_PATTERNS.find(pattern=>pattern.trains.includes(number));
 assert.equal(byTrain('9185').category,'臨時回送');
 assert.equal(byTrain('8680').schedules[0].stops.at(-1),'千代田 17:24着');
 assert.equal(byTrain('8722').schedules[0].stops[0],'なんば 14:14発');
 assert.match(byTrain('8450').chain,/8450列車 → 8673列車/);
 assert.deepEqual(byTrain('8070').schedules[0].stops,['住ノ江 10:40発','なんば 10:52着','なんば 10:58発','千代田 11:34着']);
});
