import {newHarbour,validateHarbour} from './harbour-state.js';
import {newObservatory,validateObservatory} from './observatory-state.js';
import { LESSONS, lessonById } from './content.js';
const saveBases = new WeakMap();
export const SAVE_KEY = 'unfinished-world.v1';
export const DAY = 86400000;
export function random(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function newSave() {
  return { version:1, harbour:newHarbour(), observatory:newObservatory(), seed:Math.floor(Math.random()*1e9), completed:[], evidence:[], drafts:{}, runs:{}, guides:{}, position:{x:.47,y:.66}, calm:false, ending:false };
}
/** Treat imported JSON as untrusted. Copy only known fields; never merge prototypes. */
export function validateSave(raw) {
  if (!raw || raw.version !== 1) throw new Error('This is not a supported version-1 save. Your current game has not been changed.');
  const out = newSave(), ids = new Set(LESSONS.map(l=>l.id));
  if (!Number.isInteger(raw.seed) || raw.seed < 0 || raw.seed > 4294967295) throw new Error('Invalid save seed.');
  if (!Array.isArray(raw.completed) || raw.completed.some(id=>!ids.has(id))) throw new Error('Save contains unknown lesson IDs.');
  out.seed=raw.seed; out.completed=[...new Set(raw.completed)];
  if (!Array.isArray(raw.evidence) || raw.evidence.length>1000) throw new Error('Invalid evidence history.');
  out.evidence=raw.evidence.map(e=>{
    if (!e || !ids.has(e.id) || !['adventure','check'].includes(e.mode) || !Number.isFinite(e.at) || e.at < 0 || typeof e.success!=='boolean' || typeof e.assisted!=='boolean') throw new Error('Invalid evidence entry.');
    return {id:e.id, mode:e.mode, at:e.at, success:e.success, assisted:e.assisted};
  });
  for (const l of LESSONS) for (const mode of ['adventure','check']) {
    const key=l.id+':'+mode, d=raw.drafts?.[key], r=raw.runs?.[key];
    if (typeof d==='string' && d.length<=21000) out.drafts[key]=d;
    if (r && Number.isInteger(r.variant) && r.variant>=0 && r.variant<1000000 && Number.isInteger(r.hints) && r.hints>=0 && r.hints<=3 && Number.isInteger(r.attempts) && r.attempts>=0 && r.attempts<1000000) out.runs[key]={variant:r.variant,hints:r.hints,attempts:r.attempts,supported:r.supported===true};
  }
  // Optional v0.2 teaching checkpoints; old v1 saves need no reset.
  for (const id of ids) {
    const g=raw.guides?.[id];
    if(g && Number.isInteger(g.step) && g.step>=0 && g.step<50)
      out.guides[id]={step:g.step,finished:g.finished===true,skipped:g.skipped===true};
  }
  if (Number.isFinite(raw.position?.x) && Number.isFinite(raw.position?.y)) out.position={x:Math.max(.04,Math.min(.96,raw.position.x)),y:Math.max(.06,Math.min(.94,raw.position.y))};
  out.calm=raw.calm===true; out.ending=raw.ending===true && out.completed.length===LESSONS.length;
  out.observatory=validateObservatory(raw.observatory);
  out.harbour=validateHarbour(raw.harbour);
  return out;
}
export function parseSave(text) {
  if (typeof text!=='string' || text.length>500000) throw new Error('Save file is too large (maximum 500 KB).');
  try { return validateSave(JSON.parse(text)); } catch(e) { throw new Error(e instanceof SyntaxError ? 'That file is not valid JSON. Your current game is unchanged.' : e.message); }
}
export function loadSave(storage) {
  try { const text=storage.getItem(SAVE_KEY), state=text ? parseSave(text) : newSave(); saveBases.set(state,text); return {state,warning:''}; }
  catch(e) { return {state:newSave(),warning:'The stored save could not be read. It has NOT been overwritten. Export this session before leaving. '+e.message,blocked:true}; }
}
export function persist(state,storage) {
  try {
    // A restored Back/Forward page or another tab must not overwrite newer work.
    if(saveBases.has(state) && storage.getItem(SAVE_KEY)!==saveBases.get(state))
      return 'A newer save exists in another page or tab. This session was NOT written. Export this session if needed, then reload to load the newer save.';
    const text=JSON.stringify(state); storage.setItem(SAVE_KEY,text); saveBases.set(state,text); return '';
  } catch { return 'Browser storage is unavailable or full. Progress is in memory only; use Export save.'; }
}
export function runState(state,id,mode) {
  const key=id+':'+mode;
  return state.runs[key] ??= {variant:0,hints:0,attempts:0};
}
export function seedFor(state,id,mode) {
  let seed=state.seed;
  for(const c of id+mode) seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  return (seed+runState(state,id,mode).variant*7919)>>>0;
}
export function record(state,id,mode,success,at=Date.now()) {
  if(!lessonById(id)) throw new Error('Unknown lesson');
  const run=runState(state,id,mode);
  const assisted=run.supported===true || run.hints>0 || (mode==='check' && run.attempts>0);
  state.evidence.push({id,mode,success,assisted,at});
  state.evidence=state.evidence.slice(-1000); run.attempts++;
  if(success && mode==='adventure' && !state.completed.includes(id)) state.completed.push(id);
}
export function evidenceLabel(state,id) {
  const all=state.evidence.filter(e=>e.id===id && e.success);
  const checks=all.filter(e=>e.mode==='check'&&!e.assisted).sort((a,b)=>a.at-b.at);
  if(checks.length>1 && checks.at(-1).at-checks[0].at>=DAY) return 'Later check passed';
  if(checks.length) return 'Fresh check passed';
  if(all.some(e=>e.mode==='adventure'&&!e.assisted)) return 'Solved in the world';
  if(all.length) return 'Practised with support';
  return 'Not yet demonstrated';
}
export function setCase(seed,op) {
  const rng=random(seed), start=1+Math.floor(rng()*20);
  const U=Array.from({length:8},(_,i)=>start+i);
  const shuffled=[...U];
  for(let i=7;i>0;i--) { const j=Math.floor(rng()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
  const A=[...shuffled.slice(0,2),...shuffled.slice(4,6)].sort((a,b)=>a-b);
  const B=[...shuffled.slice(2,4),...shuffled.slice(4,6)].sort((a,b)=>a-b);
  return {U,A,B,op,expected:setResult(U,A,B,op)};
}
export function setResult(U,A,B,op) {
  const a=new Set(A), b=new Set(B);
  const test={union:x=>a.has(x)||b.has(x), intersection:x=>a.has(x)&&b.has(x), difference:x=>a.has(x)&&!b.has(x), complement:x=>!a.has(x)}[op];
  if(!test) throw new Error('Unknown set operation');
  return [...new Set(U)].filter(test).sort((a,b)=>a-b);
}
export function parseSet(text) {
  const clean=text.trim().replace(/^\{(.*)\}$/s,'$1').trim();
  if(clean===''||clean==='∅') return [];
  if(!/^[+-]?\d+(?:[\s,;]+[+-]?\d+)*$/.test(clean)) throw new Error('Enter integers separated by commas, e.g. {2, 5, 9}, or {} for the empty set.');
  const nums=clean.split(/[\s,;]+/).map(Number);
  if(nums.some(n=>!Number.isSafeInteger(n))) throw new Error('An entry is outside the supported integer range.');
  return [...new Set(nums)].sort((a,b)=>a-b);
}
export const sameSet=(a,b)=>a.length===b.length&&[...a].sort((x,y)=>x-y).every((x,i)=>x===[...b].sort((x,y)=>x-y)[i]);
export const setText=a=>'{'+a.join(', ')+'}';
export const expression=op=>({union:'A ∪ B',intersection:'A ∩ B',difference:'A ∖ B',complement:'Aᶜ = U ∖ A'})[op];
export function pythonCases(id,seed,mode='adventure') {
  const rng=random(seed), n=2+Math.floor(rng()*6), k=mode==='check'?5:3;
  if(id==='py-energy') return [{pods:n,leak:2,rate:k},{pods:0,leak:0,rate:k},{pods:1,leak:1,rate:k},{pods:n+3,leak:4,rate:k}].map(inputs=>({inputs,expected:inputs.pods*k-inputs.leak}));
  if(id==='py-decision') return [{wind:n-1,limit:n,charged:true},{wind:n,limit:n,charged:true},{wind:n-1,limit:n,charged:false},{wind:n+1,limit:n,charged:true},{wind:0,limit:n,charged:true}].map(inputs=>({inputs,expected:inputs.charged&&inputs.wind<inputs.limit}));
  return [n,0,1,n+4].map(stops=>({inputs:{stops},expected:stops*(stops+1)/2}));
}
export function webSpec(id,seed,mode) {
  const n=(seed%97)+1;
  return {title:mode==='check'?'Field notebook '+n:'The Paper Observatory',target:(mode==='check'?'chapter-':'star-')+n, className:mode==='check'?'note':'beacon', colour:mode==='check'?'#89dceb':'#ffd166', padding:mode==='check'?20:16};
}
