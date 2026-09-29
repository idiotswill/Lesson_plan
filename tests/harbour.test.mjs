import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSave,parseSave,loadSave,persist,SAVE_KEY} from '../src/core.js';
import {newHarbour,validateHarbour,TRACKS,ORDERS,CRATES,selectCrates,gateValue,scanManifest,powerCycle,planDelivery,stepJourney,cancelJourney} from '../src/harbour-state.js';
import {STATIONS} from '../src/harbour-content.js';
const ready=()=>{const h=newHarbour();Object.assign(h,{selected:['lens','chart'],scanner:'processor',processor:'display',gate:'and'});scanManifest(h);return h;};
const runAll=(h,j)=>{h.journey=j;h.stage='travelling';while(stepJourney(h));};
const page={direction:'north',message:'Page sends Pip north.'},python={value:8,error:''};
test('five parallel tracks have beginner teaching, separate examples and manipulable stations',()=>{
 assert.deepEqual([...TRACKS].sort(),STATIONS.map(s=>s.id).sort());
 for(const s of STATIONS){assert.equal(s.lessons.length,3);for(const l of s.lessons)for(const key of ['title','text','example','try'])assert.ok(l[key].length>10);assert.equal(s.unlock,undefined);}
 assert.equal(ORDERS.length,3);assert.ok(ORDERS.every(o=>!o.prerequisites));
});
test('membership rules route the actual overlap only once and preserve direction',()=>{
 assert.deepEqual(selectCrates('a'),['lens','lantern']);assert.deepEqual(selectCrates('b'),['lens','chart']);
 assert.deepEqual(selectCrates('union'),['lens','lantern','chart']);assert.deepEqual(selectCrates('intersection'),['lens']);
 assert.deepEqual(selectCrates('difference'),['lantern']);assert.deepEqual(selectCrates('complement'),['chart','ribbon']);
});
test('gate truth tables include critical OR versus AND counterexamples',()=>{
 for(const a of [false,true])for(const b of [false,true]){assert.equal(gateValue('and',a,b),a&&b);assert.equal(gateValue('or',a,b),a||b);assert.equal(gateValue('not-a',a,b),!a);}
 assert.equal(gateValue('off',true,true),false);
});
test('computer data route is functional, not a sequence of correct-answer flags',()=>{
 const h=ready();h.scanner='display';assert.equal(scanManifest(h).ok,false);assert.deepEqual(h.screen,[]);
 h.scanner='processor';h.processor='storage';assert.equal(scanManifest(h).ok,false);assert.deepEqual(h.archive,['lens','chart']);assert.deepEqual(h.screen,[]);
 h.processor='display';h.memory=true;assert.equal(scanManifest(h).ok,true);assert.deepEqual(h.screen,h.archive);
});
test('power switch clears working output, not persistent stored copy',()=>{
 const h=ready();h.memory=true;scanManifest(h);powerCycle(h);assert.deepEqual(h.screen,[]);assert.deepEqual(h.archive,['lens','chart']);
});
test('successful delivery uses all five current systems and changes the world once',()=>{
 const h=ready();const j=planDelivery(h,page,python);assert.equal(j.success,true);assert.equal(h.deliveries.length,0);
 runAll(h,j);assert.deepEqual(h.deliveries,['observation']);assert.equal(h.journal.length,1);assert.equal(h.stage,'arrived');
 stepJourney(h);assert.equal(h.journal.length,1);
});
test('a good program is not a substitute for correct cargo',()=>{
 const h=ready();h.selected=['lantern'];scanManifest(h);const j=planDelivery(h,page,python);assert.equal(j.success,false);assert.match(j.events.at(-1).text,/Missing: lens, chart.*Extra: lantern/);assert.equal(j.events.at(-1).progress,1);
});
test('empty and stale computer output prevent dispatch before consuming energy',()=>{
 const h=ready();h.selected.push('lantern');let j=planDelivery(h,page,python);assert.equal(j.success,false);assert.match(j.events.at(-1).text,/older selection/);assert.equal(j.events.at(-1).progress,0);
 h.screen=[];assert.equal(planDelivery(h,page,python).success,false);
});
test('the real document direction changes Pip destination even with valid cargo',()=>{
 const j=planDelivery(ready(),{direction:'west'},python);assert.equal(j.direction,'west');assert.equal(j.success,false);assert.match(j.events.at(-1).text,/page sent Pip west/);
});
test('broken pages cannot be replaced by old lesson completion',()=>{
 const h=ready();const j=planDelivery(h,{error:'Broken target'},python);assert.equal(j.success,false);assert.equal(j.events.at(-1).text,'Broken target');
});
test('battery capacity, load cost and every path segment come from the actual program',()=>{
 const h=ready();assert.equal(planDelivery(h,page,{value:5}).success,true);assert.equal(planDelivery(h,page,{value:4}).success,false);
 assert.equal(planDelivery(h,page,{value:0}).success,false);assert.equal(planDelivery(h,page,{value:-2}).success,false);
 assert.equal(planDelivery(h,page,{value:999}).success,true);assert.match(planDelivery(h,page,{value:999}).events.map(e=>e.text).join(' '),/Battery holds 12/);
 for(const v of [true,false,'8',null,NaN,Infinity])assert.equal(planDelivery(h,page,{value:v}).success,false);
});
test('AND waits while OR attempts a blocked departure; neither fakes success',()=>{
 const h=ready();h.clear=false;let j=planDelivery(h,page,python);assert.match(j.events.at(-1).text,/signal is off/);
 h.gate='or';j=planDelivery(h,page,python);assert.match(j.events.at(-1).text,/channel was blocked/);assert.ok(j.events.at(-1).progress>0);assert.equal(j.success,false);
});
test('each request is playable first, without unrelated progression gates',()=>{
 for(const o of ORDERS){const h=ready();h.order=o.id;h.selected=selectCrates(o.rule);scanManifest(h);const j=planDelivery(h,{direction:o.direction},{value:12});assert.equal(j.success,true);runAll(h,j);assert.deepEqual(h.deliveries,[o.id]);}
});
test('all requests reuse existing code, page-related state, gate and cables',()=>{
 const h=ready();for(const o of ORDERS){h.order=o.id;h.selected=selectCrates(o.rule);scanManifest(h);runAll(h,planDelivery(h,{direction:o.direction},python));}
 assert.equal(h.deliveries.length,3);assert.equal(h.gate,'and');assert.equal(h.scanner,'processor');assert.equal(h.code,newHarbour().code);
});
test('edits cancel unfinished journeys without granting a discovery',()=>{
 const h=ready();h.journey=planDelivery(h,page,python);h.stage='travelling';stepJourney(h);assert.equal(cancelJourney(h),true);assert.equal(h.journey,null);assert.deepEqual(h.deliveries,[]);
});
test('legacy and Observatory saves preserve drafts and achievements and gain an empty harbour',()=>{
 const s=newSave();delete s.harbour;s.observatory.html='<h1>My existing page</h1>';s.completed=['set-union'];s.drafts['py-energy:adventure']='energy = 7';
 const restored=parseSave(JSON.stringify(s));assert.equal(restored.harbour.order,'observation');assert.equal(restored.observatory.html,s.observatory.html);assert.deepEqual(restored.completed,s.completed);assert.deepEqual(restored.drafts,s.drafts);
});
test('save roundtrip resumes an unfinished journey at the same observation',()=>{
 const s=newSave();s.harbour=ready();s.harbour.journey=planDelivery(s.harbour,page,python);s.harbour.stage='travelling';stepJourney(s.harbour);
 const restored=parseSave(JSON.stringify(s));assert.equal(restored.harbour.journey.cursor,1);assert.deepEqual(restored.harbour,s.harbour);
});
test('future/corrupt versions and oversized histories are rejected rather than stripped',()=>{
 assert.throws(()=>validateHarbour({...newHarbour(),version:2}));assert.throws(()=>validateHarbour({...newHarbour(),selected:['invented']}));assert.throws(()=>validateHarbour({...newHarbour(),journal:Array(61).fill('x')}));
 assert.throws(()=>validateHarbour({...newHarbour(),stage:'travelling'}));assert.throws(()=>validateHarbour({...newHarbour(),code:'x'.repeat(18001)}));
});
test('unknown imported fields and prototype pollution do not enter live harbour state',()=>{
 const raw=JSON.parse(JSON.stringify(newHarbour()).replace('"version":1','"version":1,"__proto__":{"polluted":true},"private":"no"'));const safe=validateHarbour(raw);assert.equal(safe.private,undefined);assert.equal(safe.polluted,undefined);assert.equal({}.polluted,undefined);
});
test('a stale tab still cannot overwrite newer harbour or Observatory work',()=>{
 let raw=JSON.stringify(newSave());const store={getItem:()=>raw,setItem:(_,v)=>{raw=v;}};const a=loadSave(store).state,b=loadSave(store).state;a.harbour.code='energy=5';assert.equal(persist(a,store),'');b.observatory.html='older';assert.match(persist(b,store),/NOT written/);assert.equal(JSON.parse(raw).harbour.code,'energy=5');
});
test('active Python adapter has no CDN and both entry routes preserve direct access',()=>{
 const root=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(root,/src\/harbour.js/);assert.match(root,/expedition.html/);
 const runtime=readFileSync(new URL('../src/python.js',import.meta.url),'utf8');assert.match(runtime,/\/api\/python/);assert.doesNotMatch(runtime,/https:\/\//);
});
