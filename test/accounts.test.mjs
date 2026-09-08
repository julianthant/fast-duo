import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCredential, validateAccount, isDuoOrigin, validateCredentials } from '../src/accounts.js';
const accounts=[{id:'a',username:'juzaw',enabled:true},{id:'b',username:'jzaw',enabled:true}];
const a={accountId:'a',credentialId:btoa('alpha'),rpId:'duosecurity.com',status:'ready',transport:'internal',isResidentCredential:true,userHandle:btoa('a')};
const b={...a,accountId:'b',credentialId:btoa('beta'),transport:'usb',userHandle:btoa('b')};
const state={accounts,credentials:[a,b]};
const req={rpId:'duosecurity.com',allowCredentials:[b.credentialId],usernames:[]};
test('server key IDs select the correct account without a username',()=>assert.equal(selectCredential(state,req).credential,b));
test('similar usernames match exactly; no substring confusion',()=>assert.equal(selectCredential(state,{...req,allowCredentials:[],usernames:[' JZAW ']}).credential,b));
test('a username cannot override Duo’s credential allowlist',()=>assert.match(selectCredential(state,{...req,usernames:['juzaw']}).reason,/No linked key/));
test('unknown username, unknown key and conflicting usernames all defer',()=>{
  for(const r of [{...req,usernames:['someone']},{...req,allowCredentials:[btoa('other')]},{...req,usernames:['jzaw','juzaw']}])assert.ok(selectCredential(state,r).reason);
});
test('empty allowlist without a username never picks the first stored key',()=>assert.ok(selectCredential(state,{...req,allowCredentials:[]}).reason));
test('discoverable authentication requires a resident credential and user handle',()=>{
  for(const patch of [{isResidentCredential:false},{userHandle:null},{status:'pending'}])assert.ok(selectCredential({...state,credentials:[{...b,...patch}]},{...req,allowCredentials:[],usernames:['jzaw']}).reason);
});
test('paused account cannot sign even with the correct requested key',()=>assert.ok(selectCredential({...state,accounts:accounts.map(x=>({...x,enabled:false}))},req).reason));
test('keys from multiple accounts in the allowlist require disambiguation',()=>assert.ok(selectCredential(state,{...req,allowCredentials:[a.credentialId,b.credentialId]}).reason));
test('pending enrollment can be activated by a server request for that exact ID',()=>assert.equal(selectCredential({...state,credentials:[{...b,status:'pending'}]},req).credential.status,'pending'));
test('usernames and sign-in links validate strictly',()=>{
  assert.equal(validateAccount({username:' JZAW '}).username,'jzaw');
  for(const input of [{username:'jzaw'},{username:'bad user'},{username:'x',loginUrl:'http://example.com'},{username:'x',loginUrl:'https://user:secret@example.com'}])assert.throws(()=>validateAccount(input,accounts));
});
test('Duo origin must be HTTPS with the exact domain suffix',()=>{
  for(const value of ['https://api-1.duosecurity.com/frame','https://duosecurity.com/'])assert.equal(isDuoOrigin(value),true);
  for(const value of ['http://api.duosecurity.com/','https://duosecurity.com.evil.test/','https://evilduosecurity.com/','https://user@duosecurity.com/','garbage'])assert.equal(isDuoOrigin(value),false);
});
test('imports reject partial invalid or duplicate sets',()=>{
  const c={...a,privateKey:btoa('key'),signCount:0};
  assert.equal(validateCredentials([c]).length,1);
  for(const input of [[c,{...c,privateKey:''}],[c,c],[],[{...c,signCount:-1}]])assert.throws(()=>validateCredentials(input));
});
