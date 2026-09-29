import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS,TOPICS,ISLANDS} from '../src/content.js';
import {newSave,parseSave,validateSave,loadSave,persist,runState,seedFor,record,evidenceLabel,random,setCase,setResult,sameSet,parseSet,pythonCases,webSpec,DAY} from '../src/core.js';
test('unique activities have topic notes; pending islands contain no pretend lessons',()=>{
 assert.equal(new Set(LESSONS.map(l=>l.id)).size,10);
 for(const l of LESSONS){assert.ok(TOPICS[l.island]);assert.ok(ISLANDS.some(i=>i.id===l.island&&!i.pending));assert.ok(l.hints.length);}
 assert.ok(ISLANDS.every(i=>i.subject));
 assert.ok(!LESSONS.some(l=>['digital','computing'].includes(l.island)));
});
test('deterministic random stream and stable, distinct mode seeds',()=>{
 const a=random(91),b=random(91);for(let i=0;i<100;i++)assert.equal(a(),b());
 const s=newSave();assert.equal(seedFor(s,'set-union','adventure'),seedFor(s,'set-union','adventure'));
 assert.notEqual(seedFor(s,'set-union','check'),seedFor(s,'set-union','adventure'));
 const old=seedFor(s,'set-union','adventure');runState(s,'set-union','adventure').variant++;assert.notEqual(old,seedFor(s,'set-union','adventure'));
});
test('set operations include overlap, direction, complement and empty sets',()=>{
 const U=[1,2,3,4],A=[1,2],B=[2,3];
 assert.deepEqual(setResult(U,A,B,'union'),[1,2,3]);assert.deepEqual(setResult(U,A,B,'intersection'),[2]);assert.deepEqual(setResult(U,A,B,'difference'),[1]);assert.deepEqual(setResult(U,A,B,'complement'),[3,4]);
 assert.deepEqual(setResult(U,[],[],'intersection'),[]);assert.deepEqual(setResult(U,[],[],'complement'),U);assert.deepEqual(setResult(U,U,U,'difference'),[]);
 assert.throws(()=>setResult(U,A,B,'wrong'));
});
test('generated set cases match independently expressed reference rules over 500 seeds',()=>{
 for(let seed=0;seed<500;seed++)for(const op of ['union','intersection','difference','complement']){
  const c=setCase(seed,op);assert.equal(new Set(c.U).size,8);assert.equal(c.A.length,4);assert.equal(c.B.length,4);
  let expected;if(op==='union')expected=[...new Set([...c.A,...c.B])];if(op==='intersection')expected=c.A.filter(n=>c.B.includes(n));if(op==='difference')expected=c.A.filter(n=>!c.B.includes(n));if(op==='complement')expected=c.U.filter(n=>!c.A.includes(n));
  assert.ok(sameSet(c.expected,expected));
 }
});
test('set parser accepts mathematical notation and rejects code/invalid integers',()=>{
 assert.deepEqual(parseSet('{7, 2, 7}'),[2,7]);assert.deepEqual(parseSet('  '),[]);assert.deepEqual(parseSet('∅'),[]);assert.deepEqual(parseSet('{}'),[]);assert.deepEqual(parseSet('-2; 0; 3'),[-2,0,3]);
 for(const input of ['alert(1)','2,wat','2.5','Infinity','9007199254740993'])assert.throws(()=>parseSet(input));
});
test('round-trip saves preserve progress, drafts and variants',()=>{
 const s=newSave();s.drafts['py-energy:adventure']='energy = pods * 3 - leak';runState(s,'py-energy','adventure').variant=4;record(s,'py-energy','adventure',true,100);
 const restored=parseSave(JSON.stringify(s));assert.deepEqual(restored.completed,s.completed);assert.deepEqual(restored.drafts,s.drafts);assert.equal(restored.runs['py-energy:adventure'].variant,4);
});
test('untrusted imports reject bad versions/oversize/corruption and strip unknown keys',()=>{
 assert.throws(()=>parseSave('oops'));assert.throws(()=>parseSave(' '.repeat(500001)));assert.throws(()=>validateSave({...newSave(),version:99}));assert.throws(()=>validateSave({...newSave(),completed:['invented']}));
 const s=newSave();s.secret='do not copy';s.drafts.__proto__={polluted:'yes'};const r=validateSave(s);assert.equal(r.secret,undefined);assert.equal(r.drafts.polluted,undefined);assert.equal({}.polluted,undefined);
 assert.throws(()=>validateSave({...newSave(),evidence:[{id:'py-energy',success:true,mode:'fake'}]}));
});
test('save errors do not silently erase a stored save',()=>{
 const store={getItem:()=>'{broken',setItem:()=>{throw Error('must not overwrite');}};const loaded=loadSave(store);assert.equal(loaded.blocked,true);assert.match(loaded.warning,/NOT been overwritten/);
 assert.match(persist(newSave(),store),/Export save/);
});
test('game progress is not an independent mastery claim; hints and retries matter',()=>{
 const s=newSave();assert.equal(evidenceLabel(s,'set-union'),'Not yet demonstrated');runState(s,'set-union','adventure').hints=1;record(s,'set-union','adventure',true,1);assert.equal(evidenceLabel(s,'set-union'),'Practised with support');
 record(s,'set-union','check',false,2);record(s,'set-union','check',true,3);assert.equal(evidenceLabel(s,'set-union'),'Practised with support');
 runState(s,'set-union','check').attempts=0;record(s,'set-union','check',true,4);assert.equal(evidenceLabel(s,'set-union'),'Fresh check passed');
 runState(s,'set-union','check').attempts=0;record(s,'set-union','check',true,DAY+5);assert.equal(evidenceLabel(s,'set-union'),'Later check passed');assert.deepEqual(s.completed,['set-union']);
});
test('fresh checks do not unlock story rewards',()=>{const s=newSave();record(s,'py-energy','check',true);assert.equal(s.completed.length,0);});
test('Python cases include zero, one, strict boundary and changed transfer rate',()=>{
 for(let seed=0;seed<100;seed++){
  for(const c of pythonCases('py-energy',seed))assert.equal(c.expected,c.inputs.pods*3-c.inputs.leak);
  for(const c of pythonCases('py-energy',seed,'check'))assert.equal(c.expected,c.inputs.pods*5-c.inputs.leak);
  const decisions=pythonCases('py-decision',seed);assert.equal(decisions[1].inputs.wind,decisions[1].inputs.limit);assert.equal(decisions[1].expected,false);assert.equal(decisions[2].expected,false);
  for(const c of pythonCases('py-loop',seed)){let ref=0;for(let i=1;i<=c.inputs.stops;i++)ref+=i;assert.equal(c.expected,ref);}
 }
});
test('web transfer requirements differ from adventure',()=>{const a=webSpec('web-css',12,'adventure'),b=webSpec('web-css',12,'check');assert.notEqual(a.className,b.className);assert.notEqual(a.colour,b.colour);assert.notEqual(a.target,b.target);});
