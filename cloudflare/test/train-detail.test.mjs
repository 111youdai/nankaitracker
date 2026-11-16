import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('回送も時刻APIを取得し、取得不能時だけ位置表示に戻る',async()=>{
 const elements=new Map();
 const element=()=>({innerHTML:'',classList:{add(){},remove(){}}});
 const context={window:{stationMap:{102:'住吉東',62:'伽羅橋',101:'帝塚山'}},console,
  document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},body:element()}};
 vm.createContext(context);
 vm.runInContext(await readFile(new URL('../../ui.js',import.meta.url),'utf8'),context);
 let called=0,rendered;
 context.getResolvedKind=()=>({trainType:'回送'});
 context.getFormationInfo=()=>({});
 context.renderTrainDetail=args=>{rendered=args;};
 context.getTrainDetail=async(number,line)=>{called++;assert.equal(number,'9472');assert.equal(line,2);return {station_infos:[{station_name:'なんば',arrival_time:'17:14'}]};};
 const train={train_number:'9472',line_id:2,station_id:102,next_station_id:62};
 await context.openDetail(train);
 assert.equal(called,1);
 assert.match(context.createStationTable(rendered.detail),/17:14/);
 assert.equal(context.getPositionText(train),'住吉東付近（走行中）');
 assert.equal(context.getPositionText({...train,next_station_id:101}),'住吉東 → 帝塚山');
 context.getTrainDetail=async()=>{throw Error('unavailable');};
 await context.openDetail(train);
 assert.match(rendered.warningText,/取得できなかった/);
 assert.equal(rendered.detail,undefined);
});
