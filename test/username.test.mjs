import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../src/username.js',import.meta.url),'utf8'),context);
function detect(text,fields=[]){return Array.from(context.DuoUsername.findUsernames({body:{innerText:text},querySelectorAll:()=>fields}));}
test('extracts explicit Duo username lines, normalized exactly',()=>{
 assert.deepEqual(detect('Welcome\nUsername: JuZaW\nSecurity key'),['juzaw']);
 assert.deepEqual(detect('Username:\njzaw\nContinue'),['jzaw']);
 assert.deepEqual(detect('Signed in as: jane@example.com'),['jane@example.com']);
});
test('visible username fields work, hidden fields and arbitrary text do not',()=>{
 assert.deepEqual(detect('Help for juzaw', [{value:'jzaw',getClientRects:()=>[{}]},{value:'secret-hidden-user',getClientRects:()=>[]}]),['jzaw']);
 assert.deepEqual(detect('juzaw and jzaw are examples'),[]);
});
test('conflicting evidence is preserved for fail-closed matching',()=>assert.deepEqual(detect('Username: juzaw\nUsername: jzaw'),['juzaw','jzaw']));
