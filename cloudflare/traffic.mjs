export const TRAFFIC_URL='https://www.traffic.nankai.co.jp/railinfo/01.html?media=pc';
export function parseTraffic(html){
 const items=[];
 for(const [id,name] of [['nankai','南海線'],['koya','高野線'],['semboku','泉北線']]){
  const section=html.match(new RegExp(`<section id="${id}-line-area">([\\s\\S]*?)</section>`));
  if(!section)throw Error('運行情報の形式が変わりました');
  const text=section[1].split('<div class="text-right">')[0].replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
  if(!text)throw Error('運行情報が空です');
  if(text==='只今、20分以上の列車の遅れはございません。')continue;
  items.push({line:id,name,text});
 }
 return items;
}
let cached=null;
export async function trafficInfo(){
 if(cached&&Date.now()-cached.time<60000)return cached.data;
 const r=await fetch(TRAFFIC_URL,{signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('取得失敗');
 const data={items:parseTraffic(await r.text()),checkedAt:new Date().toISOString(),source:TRAFFIC_URL};
 cached={time:Date.now(),data};return data;
}
