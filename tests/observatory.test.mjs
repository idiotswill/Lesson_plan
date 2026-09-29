import test from 'node:test';
import assert from 'node:assert/strict';
import {newSave,parseSave,loadSave,persist,SAVE_KEY} from '../src/core.js';
import {newObservatory,validateObservatory,beginCheck,recordCheck,STAGES,CHECKS} from '../src/observatory-state.js';
import {CHAPTERS,ASSESSMENTS} from '../src/observatory-content.js';
import {frameFragment,hasDocumentFrame,appendElement} from '../src/observatory-engine.js';
const storage=()=>{let raw=null;return {getItem:()=>raw,setItem:(_k,v)=>{raw=v;}};};
test('old saves migrate without relabelling old web achievements',()=>{
 const s=newSave();delete s.observatory;s.completed=['web-structure'];s.drafts['web-structure:adventure']='old draft';
 const r=parseSave(JSON.stringify(s));assert.deepEqual(r.completed,['web-structure']);assert.equal(r.drafts['web-structure:adventure'],'old draft');assert.deepEqual(r.observatory,newObservatory());
});
test('workshop and independent draft survive shared save export/import',()=>{
 const s=newSave(),o=s.observatory;o.html='<h1>My sky</h1>';o.css='h1 {color: gold}';o.completed=['paper'];beginCheck(o,'repair-desk','<p>Repair me</p>');recordCheck(o,false,20);
 const r=parseSave(JSON.stringify(s));assert.deepEqual(r.observatory,o);assert.equal(r.observatory.html,'<h1>My sky</h1>');
});
test('future and corrupt workshop progress is not silently discarded',()=>{
 for(const o of [{...newObservatory(),version:2},{...newObservatory(),stage:'fake'},{...newObservatory(),html:'x'.repeat(18001)},{...newObservatory(),seen:['other']}])assert.throws(()=>validateObservatory(o));
 const st=storage();st.setItem(SAVE_KEY,JSON.stringify({...newSave(),observatory:{version:22}}));assert.equal(loadSave(st).blocked,true);
});
test('unknown properties and prototypes are never copied',()=>{
 const raw=JSON.parse(JSON.stringify(newObservatory()));raw.secret='x';raw.__proto__={injected:'no'};const r=validateObservatory(raw);assert.equal(r.secret,undefined);assert.equal(r.injected,undefined);
});
test('first, corrected, assisted and repeated checks are distinguishable',()=>{
 const s=newObservatory();beginCheck(s,'reading-room');assert.equal(recordCheck(s,false),'first-unassisted');assert.equal(recordCheck(s,true),'supported');
 beginCheck(s,'repair-desk');s.check.assisted=true;assert.equal(recordCheck(s,true),'supported');beginCheck(s,'reading-room');assert.equal(recordCheck(s,true),'repeated');
 assert.deepEqual(s.completed,[]);
});
test('history is bounded and old attempts survive reload',()=>{
 const s=newObservatory();beginCheck(s,'garden');for(let i=0;i<150;i++)recordCheck(s,false,i);assert.equal(s.evidence.length,120);assert.equal(validateObservatory(s).check.attempts,150);
});
test('stale map or another tab cannot overwrite newer workshop work',()=>{
 const st=storage(),a=loadSave(st).state,b=loadSave(st).state;a.observatory.html='new';assert.equal(persist(a,st),'');b.observatory.html='old';assert.match(persist(b,st),/NOT written/);assert.equal(JSON.parse(st.getItem()).observatory.html,'new');
 const c=loadSave(st).state;c.observatory.html='fresh';assert.equal(persist(c,st),'');assert.equal(persist(c,st),'');
});
test('intentional import can replace the existing save',()=>{
 const st=storage();persist(newSave(),st);const incoming=parseSave(JSON.stringify(newSave()));incoming.observatory.html='imported';assert.equal(persist(incoming,st),'');assert.equal(JSON.parse(st.getItem()).observatory.html,'imported');
});
test('label press escapes text and appends inside the body',()=>{
 const s=appendElement('', 'h1','Stars < scripts & links');assert.match(s,/Stars &lt; scripts &amp; links/);assert.throws(()=>appendElement('','script','x'));
 const framed=frameFragment('<h1>Sky</h1>');const next=appendElement(framed,'p','Hello');assert.ok(next.indexOf('<p>Hello</p>')<next.indexOf('</body>'));assert.equal(frameFragment(next),null);
});
test('document frame rejects fragment/comment-only scaffolds',()=>{
 assert.equal(hasDocumentFrame('<h1>Hi</h1>'),false);assert.equal(hasDocumentFrame('<!-- '+frameFragment('')+' -->'),false);assert.equal(hasDocumentFrame(frameFragment('<p>x</p>')),true);
});
test('all stages have teaching, terms, worked examples and direct entries',()=>{
 assert.deepEqual(CHAPTERS.map(c=>c.id),STAGES);for(const c of CHAPTERS){assert.ok(c.goal&&c.idea&&c.term&&c.demo&&c.why&&c.tip);assert.ok(c.pieces.length>=3);}
 assert.match(CHAPTERS[0].idea,/browser/);assert.match(CHAPTERS[0].pieces[2][1],/slash/);assert.match(CHAPTERS[3].pieces[2][1],/colon/);
});
test('practice includes construction and repair, not only new labels',()=>{
 assert.deepEqual(ASSESSMENTS.map(c=>c.id),CHECKS);assert.equal(ASSESSMENTS[0].html,'');assert.match(ASSESSMENTS[1].html,/#missing/);assert.equal(new Set(ASSESSMENTS.flatMap(a=>a.routes.map(r=>r[1]))).size,6);
});
