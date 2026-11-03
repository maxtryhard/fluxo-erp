import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const cache=new Map();
async function load(path){
 if(cache.has(path))return cache.get(path);
 let {outputText}=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}});
 const matches=[...outputText.matchAll(/from ['"]([^'"]+)['"]/g)];
 for(const match of matches){
  const target=new URL(match[1]+'.ts',new URL(path,import.meta.url));
  const dependency=await load(target.href);outputText=outputText.replace(match[0],`from '${dependency}'`);
 }
 const url=`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;cache.set(path,url);return url;
}
const validation=await import(await load('../src/utils/authValidation.ts'));
const policy=await import(await load('../src/utils/authAttemptPolicy.ts'));
const errors=await import(await load('../src/services/authErrors.ts'));
const storage=new Map();
globalThis.window=new EventTarget();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
const attempts=await import(await load('../src/services/authAttempts.ts'));

test('email policy accepts common providers and aliases, rejects incomplete or malformed addresses',()=>{
 for(const email of ['pessoa@gmail.com','nome.sobrenome+rh@empresa.com.br',' Nome@EMPRESA.COM ','a@sub.empresa.org'])assert.equal(validation.emailValidationError(email),undefined,email);
 for(const email of ['', 'nome','nome@','@empresa.com','nome@empresa','nome @empresa.com','nome@-empresa.com','nome@empresa-.com','nome@empresa..com','nome..teste@empresa.com','.nome@empresa.com','a@127.0.0.1','a'.repeat(65)+'@empresa.com'])assert.ok(validation.emailValidationError(email),email);
 assert.equal(validation.normalizeAuthEmail(' Nome@EMPRESA.COM '),'nome@empresa.com');
 assert.deepEqual(validation.allowedEmailDomains,[]);
});
test('rolling attempt window, exact pause boundaries and corrupted state',()=>{
 let state=policy.emptyAttemptState();
 for(let i=0;i<5;i++)state=policy.recordAuthAttempt(state,'login',1000+i*2000);
 assert.equal(state.attempts.length,5);assert.equal(state.blockedUntil,9000+300000);
 assert.equal(policy.cleanAttemptState(state,'login',308999).attempts.length,5);
 assert.deepEqual(policy.cleanAttemptState(state,'login',309000),policy.emptyAttemptState());
 assert.equal(policy.cleanAttemptState({...state,nextAllowedAt:400000},'login',309000).nextAllowedAt,400000);
 assert.equal(policy.cleanAttemptState({attempts:[1,NaN,Infinity,'x',700000],blockedUntil:0,nextAllowedAt:0},'login',600001).attempts.length,0);
 assert.deepEqual(policy.cleanAttemptState(null,'register',1),policy.emptyAttemptState());
 assert.equal(policy.formatAuthWait(299999),'05:00');assert.equal(policy.formatAuthWait(1),'00:01');assert.equal(policy.formatAuthWait(-1),'00:00');
});
test('only invalid credentials count as failed passwords; 429 has a separate retry policy',()=>{
 assert.equal(errors.authServiceError({message:'internal',code:'invalid_credentials'}).kind,'credentials');
 assert.equal(errors.authServiceError({message:'Invalid login credentials',status:400}).kind,'credentials');
 assert.equal(errors.authServiceError({message:'Email not confirmed',status:400}).kind,'other');
 assert.equal(errors.authServiceError({message:'network',status:503}).kind,'other');
 assert.equal(errors.authServiceError({message:'pending',code:'email_not_confirmed'}).kind,'other');
 assert.equal(errors.authServiceError({message:'slow down',status:429}).kind,'rate_limit');
});
test('service coordinator blocks bursts, persists five failures, expires, and resets after success',async()=>{
 const original=Date.now;let now=1_000_000;Date.now=()=>now;storage.clear();let requests=0;
 const fail=()=>{requests++;throw new errors.AuthActionError('Invalid credentials','credentials');};
 try{
  for(let i=0;i<5;i++){
   await assert.rejects(attempts.withAuthAttempt('login',fail));
   await assert.rejects(attempts.withAuthAttempt('login',fail),e=>e.kind==='rate_limit');
   now+=2000;
  }
  assert.equal(requests,5);assert.equal(attempts.getAuthAttemptState('login').attempts.length,5);
  const saved=storage.get(attempts.authAttemptStorageKey);assert.deepEqual(Object.keys(JSON.parse(saved)).sort(),['login','register']);
  now+=300000;
  await assert.rejects(attempts.withAuthAttempt('login',fail));now+=2000;
  assert.equal(attempts.getAuthAttemptState('login').attempts.length,1);
  await attempts.withAuthAttempt('login',async()=>true);
  assert.deepEqual(attempts.getAuthAttemptState('login'),policy.emptyAttemptState());
 }finally{Date.now=original;}
});
test('signup counts sends, preserves its interval after success, and pauses after the third',async()=>{
 const original=Date.now;let now=2_000_000;Date.now=()=>now;storage.clear();let sends=0;
 try{
  for(let i=0;i<3;i++){
   await attempts.withAuthAttempt('register',async()=>{sends++;});
   await assert.rejects(attempts.withAuthAttempt('register',async()=>{sends++;}));now+=60000;
  }
  assert.equal(sends,3);assert.ok(attempts.getAuthAttemptState('register').blockedUntil>now);
  now+=600000;await attempts.withAuthAttempt('register',async()=>{sends++;});assert.equal(sends,4);
 }finally{Date.now=original;}
});
test('network and pending-profile failures do not consume login attempts; double submissions are rejected',async()=>{
 const original=Date.now;let now=4_000_000;Date.now=()=>now;storage.clear();let finish;
 try{
  const first=attempts.withAuthAttempt('login',()=>new Promise(resolve=>{finish=resolve;}));
  await assert.rejects(attempts.withAuthAttempt('login',async()=>true),e=>e.kind==='busy');finish(true);await first;
  for(const failure of [new Error('Pending profile'),new errors.AuthActionError('Offline','other')]){
   now+=2000;await assert.rejects(attempts.withAuthAttempt('login',async()=>{throw failure;}));
   assert.equal(attempts.getAuthAttemptState('login').attempts.length,0);
  }
  now+=2000;await assert.rejects(attempts.withAuthAttempt('login',async()=>{throw new errors.AuthActionError('Limit','rate_limit',now+90000);}));
  assert.equal(attempts.getAuthAttemptState('login').nextAllowedAt,now+90000);
  assert.equal(attempts.getAuthAttemptState('login').attempts.length,0);
 }finally{Date.now=original;}
});
