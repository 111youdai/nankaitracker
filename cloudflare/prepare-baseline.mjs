// Run locally on Node 22+ before first deployment. No Cloudflare secrets are needed.
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import core from './core.cjs';
const now=new Date(),day=core.serviceDate(now),sql=[];
const q=x=>"'"+String(x).replaceAll("'","''")+"'";
async function request(endpoint,params){const r=await fetch('https://unyohub.2pd.jp/api/'+endpoint+'.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,last_modified_timestamp:'0'}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
for(const group of ['nankai','koya']){
 const revisions=await request('diagram_revisions',{railroad_id:group});
 if(!Array.isArray(revisions)||!revisions.every(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)))throw Error('改正日一覧が不正です');
 const revision=revisions.filter(r=>r<=day).sort().at(-1);if(!revision)throw Error('改正日が見つかりません');
 sql.push(`INSERT OR REPLACE INTO meta VALUES (${q('revisions:'+group)},${q(JSON.stringify({revisions,checkedAt:now.toISOString()}))});`);
 for(const diagram of ['weekday','holiday']){
  const parsed=core.tableNumbers(await request('operation_table',{railroad_id:group,diagram_revision:revision,diagram_id:diagram}));
  const expected=group==='nankai'?['honsen','kukosen','shiomibashisen','takashinohamasen','tanagawasen','kadasen','wakayamakosen']:['koyasen','sembokusen'];
  if(expected.some(x=>!parsed.lines.includes(x)))throw Error('支線が不足しています');
  sql.push(`INSERT OR REPLACE INTO baselines VALUES (${[group,diagram,revision,now.toISOString(),JSON.stringify(parsed)].map(q).join(',')});`);
  console.log(group,diagram,revision,parsed.numbers.length+'列番');
 }
}
await writeFile(fileURLToPath(new URL('./baseline-seed.sql',import.meta.url)),sql.join('\n')+'\n');
console.log('baseline-seed.sql を作成しました。2時間以内にD1へ読み込んでください。');
