const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const un64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
async function key(password){return crypto.subtle.importKey('raw',enc.encode(password),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function issue(password){const p=b64(enc.encode(JSON.stringify({scope:'cloudflare-logs-v1',exp:Date.now()+43200000,nonce:crypto.randomUUID()})));return p+'.'+b64(await crypto.subtle.sign('HMAC',await key(password),enc.encode(p)));}
export async function authorized(request,password){
 if(!password)return false;
 try{const m=(request.headers.get('Authorization')||'').match(/^Bearer ([\w-]+)\.([\w-]+)$/i);if(!m)return false;
 if(!await crypto.subtle.verify('HMAC',await key(password),un64(m[2]),enc.encode(m[1])))return false;
 const p=JSON.parse(new TextDecoder().decode(un64(m[1])));return p.scope==='cloudflare-logs-v1'&&Number.isFinite(p.exp)&&p.exp>Date.now();}catch{return false;}
}
export async function samePassword(a,b){if(typeof a!=='string'||typeof b!=='string'||!b)return false;const k=await key(b),msg=enc.encode('login');return crypto.subtle.verify('HMAC',k,await crypto.subtle.sign('HMAC',await key(a||'\0'),msg),msg);}
