import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTraffic} from '../traffic.mjs';
const normal='只今、20分以上の列車の遅れはございません。';
const page=message=>['nankai','koya','semboku'].map(id=>`<section id="${id}-line-area"><div>${id==='koya'?message:normal}</div><div class="text-right">公式SNS</div></section>`).join('');
test('平常時は非表示、障害時だけ公式本文を返し、形式変更を平常扱いしない',()=>{
 assert.deepEqual(parseTraffic(page(normal)),[]);
 const items=parseTraffic(page('<div class="text-danger">停電のため運転見合せ</div>'));
 assert.deepEqual(items,[{line:'koya',name:'高野線',text:'停電のため運転見合せ'}]);
 assert.throws(()=>parseTraffic('<html>メンテナンス</html>'));
});
