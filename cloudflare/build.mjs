import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('.',import.meta.url));
const html=await readFile(new URL('./public/logs.html',import.meta.url),'utf8');
const js=await readFile(new URL('./public/logs.js',import.meta.url),'utf8');
const entry=`import worker from './worker.mjs';
const pages={ '/logs.html':${JSON.stringify(html)},'/logs.js':${JSON.stringify(js)}};
export default {
 scheduled:worker.scheduled,
 fetch(request,env,ctx){return worker.fetch(request,{...env,ASSETS:{fetch:async(r)=>{
 const path=new URL(r.url).pathname;
 return new Response(pages[path]??'Not found',{status:path in pages?200:404,headers:{'Content-Type':path.endsWith('.js')?'text/javascript;charset=UTF-8':'text/html;charset=UTF-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
 }}},ctx);}
};`;
await mkdir(new URL('./dist',import.meta.url),{recursive:true});
await build({stdin:{contents:entry,resolveDir:root},bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:root+'dist/worker.mjs'});
console.log('Built dist/worker.mjs');
