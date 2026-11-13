(() => {
 const banner=document.getElementById('trafficBanner');
 let busy=false;
 function officialLink(text){const a=document.createElement('a');a.href='https://www.traffic.nankai.co.jp/railinfo/01.html?media=pc';a.target='_blank';a.rel='noopener';a.textContent=text;return a;}
 async function refresh(){
  if(busy||document.hidden)return;busy=true;
  try{
   const r=await fetch(`${window.TRACKER_LOG_WORKER_URL}/api/traffic`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw Error();
   const data=await r.json();banner.replaceChildren();banner.hidden=data.items.length===0;
   for(const item of data.items){
    const article=document.createElement('article'),title=document.createElement('strong'),text=document.createElement('p');
    title.textContent=`⚠ ${item.name} 運行情報`;text.textContent=item.text;article.append(title,text);banner.append(article);
   }
   if(data.items.length)banner.append(officialLink('南海電鉄の最新運行情報 ↗'));
  }catch{banner.hidden=false;banner.replaceChildren(officialLink('運行情報を取得できません。公式情報を確認 ↗'));}
  finally{busy=false;}
 }
 document.getElementById('refreshTrains').addEventListener('click',refresh);
 document.addEventListener('visibilitychange',refresh);setInterval(refresh,60000);refresh();
})();
