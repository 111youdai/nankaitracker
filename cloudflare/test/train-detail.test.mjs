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

test('ライブ行先を表示し、通常ダイヤと違う場合は行先変更として扱う',async()=>{
 const elements=new Map();
 const element=()=>({innerHTML:'',classList:{add(){},remove(){}}});
 const context={window:{
  stationMap:{119:'林間田園都市'},
  getTrainDestinationName(line,id){
   assert.equal(line,2);assert.equal(id,25);return '千代田信号場';
  }
 },console,
 document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},body:element()}};
 vm.createContext(context);
 vm.runInContext(await readFile(new URL('../../ui.js',import.meta.url),'utf8'),context);
 const train={train_number:'0606',line_id:2,station_id:119,next_station_id:null,destination_station_id:25,direction:'up'};
 const state=context.getDestinationState(train,{arrival_station_name:'なんば'});
 assert.equal(state.live,'千代田信号場');
 assert.equal(state.scheduled,'なんば');
 assert.equal(state.changed,true);
 assert.equal(context.getDestinationState(train,{arrival_station_name:'千代田信号所'}).changed,false);
 const content=element();
 context.renderTrainDetail({
  content,train,
  kindInfo:{trainType:'特急りんかん',section:'難波～橋本'},
  formationInfo:{sembokuService:false,totalCars:null,formationReliable:false,problems:[]},
  detail:{train_kind_name:'特急Ｃ',departure_station_name:'橋本',arrival_station_name:'なんば',station_infos:[]}
 });
 assert.match(content.innerHTML,/行先変更/);
 assert.match(content.innerHTML,/千代田信号場行き/);
 assert.match(content.innerHTML,/通常はなんば行き/);
 assert.match(content.innerHTML,/橋本 → 千代田信号場/);
});

test('泉北線内の列車に異常な高野線駅IDが混ざっても沢ノ町側へ置かない',async()=>{
 const context={window:{
  isSembokuService(train){return train.destination_station_id===66;},
  canPlaceOnSemboku(){return true;}
 },console,document:{getElementById(){return null;},body:{classList:{add(){},remove(){}}}}};
 vm.createContext(context);
 vm.runInContext(await readFile(new URL('../../ui.js',import.meta.url),'utf8'),context);
 const train={
  train_number:'5801',line_id:2,station_id:151,next_station_id:103,
  destination_station_id:66
 };
 assert.equal(context.canRenderAtRawStation(train,103,'koya'),false);
 assert.equal(context.canRenderAtRawStation(train,151,'semboku'),true);
 assert.equal(context.canRenderAtRawStation({...train,station_id:103,next_station_id:104,destination_station_id:1},103,'koya'),true);
});
