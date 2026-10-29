'use strict';
// Japanese station names from the Nankai app line feed. Branch junction aliases
// match the placement aliases used by the existing tracker UI.
const STATION_NAMES=Object.freeze({
  1:'なんば',2:'新今宮',3:'天下茶屋',4:'岸里玉出',5:'粉浜',6:'住吉大社',7:'住ノ江',8:'七道',9:'堺',10:'湊',11:'石津川',12:'諏訪ノ森',13:'浜寺公園',14:'羽衣',15:'高石',16:'北助松',17:'松ノ浜',18:'泉大津',19:'忠岡',20:'春木',21:'和泉大宮',22:'岸和田',23:'蛸地蔵',24:'貝塚',25:'二色浜',26:'鶴原',27:'井原里',28:'泉佐野',29:'羽倉崎',30:'吉見ノ里',31:'岡田浦',32:'樽井',33:'尾崎',34:'鳥取ノ荘',35:'箱作',36:'淡輪',37:'みさき公園',38:'孝子',39:'和歌山大学前',40:'紀ノ川',41:'和歌山市',42:'和歌山港',
  61:'羽衣',62:'伽羅橋',63:'高師浜',75:'泉佐野',76:'りんくうタウン',77:'関西空港',81:'多奈川',82:'深日港',83:'深日町',84:'みさき公園',87:'紀ノ川',88:'東松江',89:'中松江',90:'八幡前',91:'西ノ庄',92:'二里ケ浜',93:'磯ノ浦',94:'加太',
  95:'なんば',96:'今宮戎',97:'新今宮',98:'萩ノ茶屋',99:'天下茶屋',100:'岸里玉出',101:'帝塚山',102:'住吉東',103:'沢ノ町',104:'我孫子前',105:'浅香山',106:'堺東',107:'三国ケ丘',108:'百舌鳥八幡',109:'中百舌鳥',110:'白鷺',111:'初芝',112:'萩原天神',113:'北野田',114:'狭山',115:'大阪狭山市',116:'金剛',117:'滝谷',118:'千代田',119:'河内長野',120:'三日市町',121:'美加の台',122:'千早口',123:'天見',124:'紀見峠',125:'林間田園都市',126:'御幸辻',127:'橋本',128:'紀伊清水',129:'学文路',130:'九度山',131:'高野下',132:'下古沢',133:'上古沢',134:'紀伊細川',135:'紀伊神谷',136:'極楽橋',
  137:'汐見橋',138:'芦原町',139:'木津川',140:'津守',141:'西天下茶屋',142:'岸里玉出',151:'中百舌鳥',152:'深井',153:'泉ケ丘',154:'栂・美木多',155:'光明池',156:'和泉中央'
});
function stationName(value){const id=Number(value);return Number.isInteger(id)?STATION_NAMES[id]||null:null;}
function stationLabel(value){const name=stationName(value);return name?`${name}駅`:null;}
function stationPosition(payload={}){
 const current=stationLabel(payload.station_id),hasNext=payload.next_station_id!=null&&payload.next_station_id!=='';
 const next=hasNext?stationLabel(payload.next_station_id):null,direction=String(payload.direction||'').toLowerCase();
 const directionLabel=direction==='up'?'上り':direction==='down'?'下り':'方向不明';
 let text='位置不明';
 if(current&&hasNext)text=next?`${current}～${next}間（走行中）`:`${current}付近（走行中）`;
 else if(!current&&next)text=`${next}手前（走行中）`;
 else if(current)text=`${current}（停車中）`;
 return {stationId:payload.station_id??null,nextStationId:payload.next_station_id??null,current,next,running:hasNext,direction,directionLabel,text};
}
function observedRange(first,last){const start=stationPosition(first),end=stationPosition(last);return {first:start,last:end,text:`初回：${start.text} ／ 最終：${end.text}`};}
module.exports={STATION_NAMES,stationName,stationLabel,stationPosition,observedRange};
