const encoder=new TextEncoder();
const decoder=new TextDecoder();
// The password is salted and also mixed with a Worker-only pepper. Keep this
// bounded so login remains usable on the Workers free plan; online attempts are
// separately limited per IP and account.
const PASSWORD_ITERATIONS=6000;
const SESSION_LIFETIME_MS=30*24*60*60*1000;
const MAIN_ORIGIN='https://111youdai.github.io';
const LOCAL_ORIGINS=new Set(['http://localhost:3000','http://127.0.0.1:3000','http://localhost:8787','http://127.0.0.1:8787']);

const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const un64=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),character=>character.charCodeAt(0));
const normalizeEmail=value=>String(value||'').trim().normalize('NFKC').toLowerCase();
const normalizeName=value=>String(value||'').trim().normalize('NFKC').replace(/\s+/g,' ');

function allowedOrigin(request){
 const origin=request.headers.get('Origin')||'';
 return origin===MAIN_ORIGIN||LOCAL_ORIGINS.has(origin)?origin:'';
}

export function corsHeaders(request){
 const origin=allowedOrigin(request),headers={
  'Cache-Control':'no-store',
  'Content-Type':'application/json;charset=UTF-8',
  'Vary':'Origin',
  'X-Content-Type-Options':'nosniff'
 };
 if(origin){
  headers['Access-Control-Allow-Origin']=origin;
  headers['Access-Control-Allow-Headers']='Authorization, Content-Type';
  headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';
  headers['Access-Control-Max-Age']='86400';
 }
 return headers;
}

export const accountJson=(request,value,status=200)=>new Response(JSON.stringify(value),{status,headers:corsHeaders(request)});

async function readJson(request,limit=4096){
 const body=await request.text();
 if(body.length>limit)throw Object.assign(new Error('リクエストが大きすぎます'),{status:413});
 try{return JSON.parse(body||'{}');}catch{throw Object.assign(new Error('入力内容を確認してください'),{status:400});}
}

async function importPasswordKey(password,pepper=''){
 return crypto.subtle.importKey('raw',encoder.encode(`${password}\0${pepper}`),'PBKDF2',false,['deriveBits']);
}

async function derivePassword(password,salt,iterations=PASSWORD_ITERATIONS,pepper=''){
 const key=await importPasswordKey(password,pepper);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256));
}

async function safeEqual(left,right){
 try{
  const data=encoder.encode('nankai-tracker-auth');
  const expectedKey=await crypto.subtle.importKey('raw',left,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const actualKey=await crypto.subtle.importKey('raw',right,{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const signature=await crypto.subtle.sign('HMAC',expectedKey,data);
  return crypto.subtle.verify('HMAC',actualKey,signature,data);
 }catch{return false;}
}

export async function passwordRecord(password,pepper=''){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const hash=await derivePassword(password,salt,PASSWORD_ITERATIONS,pepper);
 return {salt:b64(salt),hash:b64(hash),iterations:PASSWORD_ITERATIONS};
}

export async function verifyPassword(password,user,pepper=''){
 if(typeof password!=='string'||!user?.password_salt||!user?.password_hash)return false;
 const actual=await derivePassword(password,un64(user.password_salt),Number(user.password_iterations)||PASSWORD_ITERATIONS,pepper);
 return safeEqual(un64(user.password_hash),actual);
}

async function hmacKey(secret){
 return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}

async function sameSecret(left,right){
 if(typeof left!=='string'||typeof right!=='string'||!right)return false;
 const data=encoder.encode('owner-setup');
 const expected=await crypto.subtle.sign('HMAC',await hmacKey(right),data);
 return crypto.subtle.verify('HMAC',await hmacKey(left||'\0'),expected,data);
}

export async function issueAccountToken(user,secret){
 if(!secret)throw new Error('ACCOUNT_SESSION_SECRETが未設定です');
 const payload=b64(encoder.encode(JSON.stringify({
  scope:'nankai-tracker-account-v1',
  sub:Number(user.id),
  ver:Number(user.session_version)||1,
  exp:Date.now()+SESSION_LIFETIME_MS,
  nonce:crypto.randomUUID()
 })));
 const signature=b64(await crypto.subtle.sign('HMAC',await hmacKey(secret),encoder.encode(payload)));
 return `${payload}.${signature}`;
}

async function tokenPayload(request,secret){
 if(!secret)return null;
 try{
  const match=(request.headers.get('Authorization')||'').match(/^Bearer ([\w-]+)\.([\w-]+)$/i);
  if(!match)return null;
  const valid=await crypto.subtle.verify('HMAC',await hmacKey(secret),un64(match[2]),encoder.encode(match[1]));
  if(!valid)return null;
  const payload=JSON.parse(decoder.decode(un64(match[1])));
  if(payload.scope!=='nankai-tracker-account-v1'||!Number.isSafeInteger(payload.sub)||!Number.isFinite(payload.exp)||payload.exp<=Date.now())return null;
  return payload;
 }catch{return null;}
}

const publicUser=user=>({
 id:Number(user.id),
 email:user.email,
 displayName:user.display_name,
 role:user.role,
 status:user.status,
 createdAt:user.created_at,
 approvedAt:user.approved_at||null
});

export async function authenticateAccount(request,env){
 const payload=await tokenPayload(request,env.ACCOUNT_SESSION_SECRET);
 if(!payload)return null;
 const user=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(payload.sub).first();
 if(!user||user.status!=='approved'||Number(user.session_version)!==Number(payload.ver))return null;
 return user;
}

async function rateKey(request,email){
 const address=request.headers.get('CF-Connecting-IP')||'local';
 const digest=await crypto.subtle.digest('SHA-256',encoder.encode(`${address}|${email}`));
 return b64(digest);
}

async function loginAllowed(db,key,now){
 const row=await db.prepare('SELECT * FROM auth_limits WHERE key=?').bind(key).first();
 if(!row)return true;
 const started=Date.parse(row.window_start),fresh=Number.isFinite(started)&&now-started<15*60*1000;
 return !fresh||Number(row.attempts)<10;
}

async function failedLogin(db,key,now){
 const stamp=new Date(now).toISOString();
 await db.prepare(`INSERT INTO auth_limits(key,attempts,window_start) VALUES (?,1,?)
  ON CONFLICT(key) DO UPDATE SET
   attempts=CASE WHEN julianday(?) - julianday(window_start) >= (15.0/1440.0) THEN 1 ELSE attempts+1 END,
   window_start=CASE WHEN julianday(?) - julianday(window_start) >= (15.0/1440.0) THEN excluded.window_start ELSE window_start END`)
  .bind(key,stamp,stamp,stamp).run();
}

async function clearLoginLimit(db,key){await db.prepare('DELETE FROM auth_limits WHERE key=?').bind(key).run();}

async function ownerCount(db){return Number((await db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='owner'").first())?.n||0);}

function validateRegistration(data){
 const email=normalizeEmail(data.email),displayName=normalizeName(data.displayName),password=String(data.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>160)throw Object.assign(new Error('メールアドレスを確認してください'),{status:400});
 if(displayName.length<1||displayName.length>32)throw Object.assign(new Error('表示名は1〜32文字で入力してください'),{status:400});
 if(password.length<10||password.length>128)throw Object.assign(new Error('パスワードは10〜128文字で入力してください'),{status:400});
 return {email,displayName,password};
}

async function register(request,env){
 if(request.method!=='POST')return accountJson(request,{error:'許可されていない操作です'},405);
 const data=await readJson(request),input=validateRegistration(data),firstOwner=(await ownerCount(env.DB))===0;
 if(firstOwner){
  if(!env.ACCOUNT_SETUP_CODE)return accountJson(request,{error:'初期管理者コードが未設定です'},503);
  if(!await sameSecret(String(data.setupCode||''),env.ACCOUNT_SETUP_CODE))return accountJson(request,{error:'初期管理者コードが違います'},401);
 }
 const password=await passwordRecord(input.password,env.ACCOUNT_PASSWORD_PEPPER||env.ACCOUNT_SESSION_SECRET),now=new Date().toISOString(),role=firstOwner?'owner':'member',status=firstOwner?'approved':'pending';
 try{
  await env.DB.prepare('INSERT INTO users(email,display_name,password_salt,password_hash,password_iterations,role,status,created_at,approved_at) VALUES (?,?,?,?,?,?,?,?,?)')
   .bind(input.email,input.displayName,password.salt,password.hash,password.iterations,role,status,now,firstOwner?now:null).run();
  const user=await env.DB.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE').bind(input.email).first();
  if(firstOwner){
   const token=await issueAccountToken(user,env.ACCOUNT_SESSION_SECRET);
   return accountJson(request,{ok:true,approved:true,token,expiresIn:SESSION_LIFETIME_MS/1000,user:publicUser(user)},201);
  }
  return accountJson(request,{ok:true,approved:false,message:'登録申請を受け付けました。管理者の承認をお待ちください。'},201);
 }catch(error){
  if(/UNIQUE/i.test(error.message))return accountJson(request,{error:'このメールアドレスは登録済みです'},409);
  throw error;
 }
}

async function login(request,env){
 if(request.method!=='POST')return accountJson(request,{error:'許可されていない操作です'},405);
 const data=await readJson(request),email=normalizeEmail(data.email),password=String(data.password||''),key=await rateKey(request,email),now=Date.now();
 if(!await loginAllowed(env.DB,key,now))return accountJson(request,{error:'ログイン試行が多すぎます。15分ほど待ってください'},429);
 const user=await env.DB.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE').bind(email).first();
 if(!user||!await verifyPassword(password,user,env.ACCOUNT_PASSWORD_PEPPER||env.ACCOUNT_SESSION_SECRET)){
  await failedLogin(env.DB,key,now);
  return accountJson(request,{error:'メールアドレスまたはパスワードが違います'},401);
 }
 if(user.status==='pending')return accountJson(request,{error:'このアカウントは管理者の承認待ちです'},403);
 if(user.status!=='approved')return accountJson(request,{error:'このアカウントは現在利用できません'},403);
 await clearLoginLimit(env.DB,key);
 const token=await issueAccountToken(user,env.ACCOUNT_SESSION_SECRET);
 return accountJson(request,{ok:true,token,expiresIn:SESSION_LIFETIME_MS/1000,user:publicUser(user)});
}

async function me(request,env){
 if(request.method!=='GET')return accountJson(request,{error:'許可されていない操作です'},405);
 const user=await authenticateAccount(request,env);
 return user?accountJson(request,{user:publicUser(user)}):accountJson(request,{error:'ログインが必要です'},401);
}

async function adminUsers(request,env){
 const owner=await authenticateAccount(request,env);
 if(!owner)return accountJson(request,{error:'ログインが必要です'},401);
 if(owner.role!=='owner')return accountJson(request,{error:'管理者権限が必要です'},403);
 if(request.method==='GET'){
  const rows=(await env.DB.prepare('SELECT id,email,display_name,role,status,created_at,approved_at FROM users ORDER BY CASE status WHEN \'pending\' THEN 0 ELSE 1 END, created_at DESC').all()).results;
  return accountJson(request,{items:rows.map(publicUser)});
 }
 const match=new URL(request.url).pathname.match(/^\/api\/account\/admin\/users\/(\d+)$/);
 if(request.method==='POST'&&match){
  const id=Number(match[1]);
  if(id===Number(owner.id))return accountJson(request,{error:'自分自身の状態は変更できません'},400);
  const data=await readJson(request),status=String(data.status||'');
  if(!['approved','rejected','disabled'].includes(status))return accountJson(request,{error:'状態が不正です'},400);
  const target=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first();
  if(!target)return accountJson(request,{error:'アカウントが見つかりません'},404);
  const now=new Date().toISOString();
  await env.DB.prepare('UPDATE users SET status=?,approved_at=?,approved_by=?,session_version=session_version+1 WHERE id=?')
   .bind(status,status==='approved'?now:null,status==='approved'?owner.id:null,id).run();
  return accountJson(request,{ok:true,status});
 }
 return accountJson(request,{error:'許可されていない操作です'},405);
}

export async function handleAccountRequest(request,env){
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/account/'))return null;
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(request)});
 try{
  if(path==='/api/account/setup-status'&&request.method==='GET')return accountJson(request,{needsOwner:(await ownerCount(env.DB))===0});
  if(path==='/api/account/register')return register(request,env);
  if(path==='/api/account/login')return login(request,env);
  if(path==='/api/account/me')return me(request,env);
  if(path==='/api/account/admin/users'||/^\/api\/account\/admin\/users\/\d+$/.test(path))return adminUsers(request,env);
  return accountJson(request,{error:'見つかりません'},404);
 }catch(error){
  console.error(JSON.stringify({event:'account_request_failed',path,message:error.message}));
  const status=error.status||500;
  return accountJson(request,{error:status<500?(error.message||'入力内容を確認してください'):'アカウント処理に失敗しました'},status);
 }
}

export {publicUser};
