import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

async function linking(){
 const source=await readFile(new URL('../public/logs.js',import.meta.url),'utf8');
 const element=()=>({hidden:false,value:'',dataset:{},classList:{toggle(){}},replaceChildren(){},append(){},addEventListener(){}}),elements=new Map();
 const context={
  document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll(){return [];},createElement:element},
  sessionStorage:{getItem(){return '';},setItem(){},removeItem(){}},history:{replaceState(){}},location:{hash:''},window:{addEventListener(){}},
  setInterval(){},URL,URLSearchParams,Date,Promise,AbortSignal,fetch,Blob,console
 };
 vm.runInNewContext(source+'\nglobalThis.__linking={canLink,groupRuns};',context);
 return context.__linking;
}

function event(id,group,train,firstSeen,lastSeen){
 return {id,service_date:'2026-10-31',group_name:group,train_number:train,first_seen:firstSeen,last_seen:lastSeen,formation:{verified:true,text:'6001F (4両) + 6028F (2両)'},first_position:{current:'なんば駅',text:'なんば駅（停車中）'},last_position:{current:'なんば駅',text:'なんば駅（停車中）'}};
}

test('同一系統でも同じ編成がなんばで短時間に折り返せば一連の運転にする',async()=>{
 const {canLink,groupRuns}=await linking(),outbound=event(8,'koya','9452','2026-10-30T23:36:52.000Z','2026-10-31T00:26:52.000Z'),returning=event(9,'koya','9851','2026-10-31T00:27:52.000Z','2026-10-31T01:21:55.000Z');
 outbound.first_position={current:'千代田駅'};returning.last_position={current:'千代田駅'};
 assert.equal(canLink(outbound,returning),true);
 assert.equal(JSON.stringify(groupRuns([returning,outbound]).map(group=>group.map(item=>item.train_number))),JSON.stringify([['9452','9851']]));
});
