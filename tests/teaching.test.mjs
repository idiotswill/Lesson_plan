import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDES} from '../src/teaching-content.js';
import {guideProgress,checkGuideAnswer} from '../src/teaching.js';
import {LESSONS} from '../src/content.js';
import {newSave,validateSave,record,runState,evidenceLabel,setResult} from '../src/core.js';
test('every playable task has a source-mapped teaching path, worked steps, and guided actions',()=>{
 assert.deepEqual(Object.keys(GUIDES).sort(),LESSONS.map(l=>l.id).sort());
 for(const g of Object.values(GUIDES)){
  assert.ok(g.source.length>20);assert.ok(g.steps.length>=5);assert.ok(g.steps.at(-1).recap);
  assert.ok(g.steps.filter(s=>s.question).length>=2);
  for(const s of g.steps){assert.ok(s.title&&s.text);if(s.question){assert.ok(s.question.why&&s.question.wrong);}}
 }
});
test('all bounded warm-up answers pass; blank/incorrect answers are not accepted',()=>{
 for(const g of Object.values(GUIDES))for(const {question:q} of g.steps){
  if(!q||q.type==='html')continue; // DOM task is exercised in the browser suite.
  assert.ok(checkGuideAnswer(q,q.answer),q.prompt);assert.equal(checkGuideAnswer(q,'not an answer'),false,q.prompt);
  if(q.type==='number'){assert.equal(checkGuideAnswer(q,''),false);assert.equal(checkGuideAnswer(q,String(q.answer+1)),false);}
  if(q.type==='choice')for(const [value] of q.options)assert.equal(checkGuideAnswer(q,value),value===q.answer);
 }
});
test('set demonstrations follow membership decisions, not geometric guessing',()=>{
 for(const op of ['union','intersection','difference','complement']){
  const s=GUIDES['set-'+op].steps.find(s=>s.frames), b=s.board;
  assert.deepEqual(s.frames.at(-1).result,setResult(b.U,b.A,b.B,op));
  for(const f of s.frames)assert.deepEqual(f.result,setResult(b.U.filter(n=>n<=f.focus),b.A,b.B,op));
  const mini=GUIDES['set-'+op].steps.find(s=>s.question?.type==='set').question;
  assert.deepEqual(mini.answer,setResult([4,5,7,8],[4,5],[5,7],op));
 }
});
test('reference exercise from LA-01 p.5 agrees with checker for all four operations',()=>{
 const U=[1,2,3,4,5,6,7,8,9,10,11],A=[1,2,4,6,8,11],B=[1,3,5,7,8,9];
 assert.deepEqual(setResult(U,A,B,'union'),[1,2,3,4,5,6,7,8,9,11]);
 assert.deepEqual(setResult(U,A,B,'intersection'),[1,8]);
 assert.deepEqual(setResult(U,A,B,'difference'),[2,4,6,11]);
 assert.deepEqual(setResult(U,A,B,'complement'),[3,5,7,9,10]);
});
test('old saves gain optional teaching checkpoints without deleting evidence or drafts',()=>{
 const s=newSave();delete s.guides;s.drafts['py-loop:adventure']='charge = 0';s.completed=['set-union'];
 const migrated=validateSave(s);assert.deepEqual(migrated.guides,{});assert.equal(migrated.drafts['py-loop:adventure'],s.drafts['py-loop:adventure']);assert.deepEqual(migrated.completed,s.completed);
 const p=guideProgress(migrated,'py-loop');p.step=5;p.finished=true;
 const restored=validateSave(migrated);assert.deepEqual(restored.guides['py-loop'],{step:5,finished:true,skipped:false});
 const junk=validateSave({...newSave(),guides:{'py-loop':{step:-1},'made-up':{step:0}}});assert.deepEqual(junk.guides,{});
});
test('walkthrough progress never creates skill evidence or unlocks lanterns',()=>{
 const s=newSave();guideProgress(s,'py-energy').finished=true;
 assert.equal(s.completed.length,0);assert.equal(s.evidence.length,0);assert.equal(evidenceLabel(s,'py-energy'),'Not yet demonstrated');
 runState(s,'py-energy','check').supported=true;record(s,'py-energy','check',true);
 assert.equal(evidenceLabel(s,'py-energy'),'Practised with support');assert.equal(s.completed.length,0);
 assert.equal(validateSave(s).runs['py-energy:check'].supported,true);
});
