// Run against a local backend on http://localhost:3055 (ALLOWED_ORIGINS=http://localhost:8000). Use a throwaway DATA_FILE.
const B='http://localhost:3055', O={Origin:'http://localhost:8000'};
let fails=0; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c)fails++;};
const call=async(method,path,body,headers={})=>{const r=await fetch(B+path,{method,headers:{...O,'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch{};return {s:r.status,j};};
let r=await call('POST','/auth/register',{username:'Binh_01',password:'correct horse'}); ok(r.s===201&&r.j.token&&r.j.username==='binh_01','register (username lowercased)');
const tok=r.j.token;
r=await call('POST','/auth/register',{username:'binh_01',password:'another pass1'}); ok(r.s===409,'duplicate username 409');
r=await call('POST','/auth/register',{username:'a',password:'longenough'}); ok(r.s===400,'bad username 400');
r=await call('POST','/auth/register',{username:'validname',password:'short'}); ok(r.s===400,'short password 400');
r=await call('POST','/auth/register',{username:'__proto__',password:'longenough1'}); ok(r.s===400,'__proto__ rejected');
r=await call('POST','/auth/register',{username:'constructor',password:'longenough1'}); ok(r.s===400,'constructor rejected');
r=await call('POST','/auth/login',{username:'binh_01',password:'wrong password'}); ok(r.s===401&&/Incorrect/.test(r.j.error),'wrong password 401');
r=await call('POST','/auth/login',{username:'nobody',password:'wrong password'}); ok(r.s===401&&/Incorrect username or password/.test(r.j.error),'unknown user same message');
r=await call('POST','/auth/login',{username:'BINH_01',password:'correct horse'}); ok(r.s===200&&r.j.token,'login ok'); const tok2=r.j.token;
r=await call('GET','/auth/me',null,{Authorization:'Bearer '+tok2}); ok(r.s===200&&r.j.username==='binh_01','me');
r=await call('GET','/auth/me'); ok(r.s===401,'me without token 401');
r=await call('GET','/auth/progress',null,{Authorization:'Bearer '+tok}); ok(r.s===200&&r.j.progress===null,'empty progress');
const prog={version:2,target:'7',drafts:{'starter-writing':'hello'},sessions:[{skill:'Reading',id:'starter-reading',date:'2026-11-26T00:00:00Z',correct:3}],diagnostic:{}};
r=await call('PUT','/auth/progress',{progress:prog},{Authorization:'Bearer '+tok}); ok(r.s===200,'save progress');
r=await call('GET','/auth/progress',null,{Authorization:'Bearer '+tok2}); ok(JSON.stringify(r.j.progress)===JSON.stringify(prog),'progress readable from 2nd session');
r=await call('PUT','/auth/progress',{progress:{version:1}},{Authorization:'Bearer '+tok}); ok(r.s===400,'invalid progress 400');
r=await call('PUT','/auth/progress',{progress:prog},{}); ok(r.s===401,'PUT without token 401');
// other origin
const bad=await fetch(B+'/auth/me',{headers:{Origin:'https://evil.example',Authorization:'Bearer '+tok}}); ok(bad.status===403,'foreign origin 403');
const pre=await fetch(B+'/auth/progress',{method:'OPTIONS',headers:{Origin:'http://localhost:8000','Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'authorization,content-type'}}); ok(pre.status===204&&/PUT/.test(pre.headers.get('access-control-allow-methods')||''),'CORS preflight PUT');
// second user can't see first's data
r=await call('POST','/auth/register',{username:'other_user',password:'password123'}); const t3=r.j.token;
r=await call('GET','/auth/progress',null,{Authorization:'Bearer '+t3}); ok(r.j.progress===null,'isolated per user');
// logout invalidates
r=await call('POST','/auth/logout',null,{Authorization:'Bearer '+tok2}); ok(r.s===200,'logout');
r=await call('GET','/auth/me',null,{Authorization:'Bearer '+tok2}); ok(r.s===401,'token dead after logout');
// persistence file has hash, not password
import fs from 'fs'; const raw=fs.readFileSync('' + (process.env.DATA_FILE || '/tmp/authdata/users.json') + '','utf8'); ok(!raw.includes('correct horse')&&raw.includes('"hash"'),'no plaintext password on disk');
// AI api still gated
const a=await fetch(B+'/api/coach',{method:'POST',headers:{...O,'Content-Type':'application/json'},body:'{}'}); ok(a.status===401,'/api still needs study code');
// delete account
r=await call('DELETE','/auth/me',null,{Authorization:'Bearer '+t3}); ok(r.s===200,'delete account');
r=await call('POST','/auth/login',{username:'other_user',password:'password123'}); ok(r.s===401,'deleted account cannot login');
// rate limit on login
let last; for(let i=0;i<25;i++) last=await call('POST','/auth/login',{username:'x',password:'y'}); ok(last.s===429,'login rate limited');
console.log(fails?'FAILURES '+fails:'ALL PASS'); process.exit(fails?1:0);
