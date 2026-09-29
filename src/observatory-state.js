/** Versioned workshop progress. Old mini-exercise evidence is deliberately separate. */
export const STAGES = ['paper', 'document', 'paths', 'notices', 'opening'];
export const CHECKS = ['reading-room', 'repair-desk', 'garden'];
export function newObservatory() {
  return {version:1, stage:'paper', html:'', css:'', completed:[], evidence:[],
    check:null, seen:[], mode:'workshop'};
}
const text = (value, limit) => typeof value === 'string' && value.length <= limit;
export function validateObservatory(raw) {
  if (raw === undefined) return newObservatory();
  if (!raw || raw.version !== 1) throw Error('Unsupported Paper Observatory save. Use the app version that created it; the stored save has not been changed.');
  if (!STAGES.includes(raw.stage) || !text(raw.html,18000) || !text(raw.css,6000)
      || !Array.isArray(raw.completed) || raw.completed.some(s=>!STAGES.includes(s))
      || !Array.isArray(raw.seen) || raw.seen.some(s=>!CHECKS.includes(s))
      || !Array.isArray(raw.evidence) || raw.evidence.length>120) throw Error('Invalid Paper Observatory progress.');
  const out = newObservatory();
  out.stage=raw.stage; out.html=raw.html; out.css=raw.css;
  out.completed=[...new Set(raw.completed)]; out.seen=[...new Set(raw.seen)];
  out.evidence=raw.evidence.map(e=>{
    if (!e || e.version!==1 || !CHECKS.includes(e.id) || typeof e.success!=='boolean'
        || !['first-unassisted','supported','repeated'].includes(e.kind)
        || !Number.isFinite(e.at) || e.at<0) throw Error('Invalid Observatory practice record.');
    return {version:1,id:e.id,success:e.success,kind:e.kind,at:e.at};
  });
  if (raw.check !== null && raw.check !== undefined) {
    const c=raw.check;
    if (!CHECKS.includes(c.id) || !text(c.html,18000) || !text(c.css,6000)
        || !Number.isInteger(c.attempts) || c.attempts<0 || c.attempts>100000) throw Error('Invalid Observatory check draft.');
    out.check={id:c.id,html:c.html,css:c.css,attempts:c.attempts,assisted:c.assisted===true,repeated:c.repeated===true};
  }
  out.mode=raw.mode==='check' && out.check ? 'check' : 'workshop';
  return out;
}
export function beginCheck(state, id, html='') {
  if (!CHECKS.includes(id)) throw Error('Unknown check.');
  state.check={id,html,css:'',attempts:0,assisted:false,repeated:state.seen.includes(id)};
  state.seen=[...new Set([...state.seen,id])]; state.mode='check';
}
export function recordCheck(state, success, at=Date.now()) {
  const c=state.check;
  if (!c || typeof success!=='boolean') throw Error('No active check.');
  const kind=c.repeated?'repeated':c.assisted||c.attempts>0?'supported':'first-unassisted';
  state.evidence.push({version:1,id:c.id,success,kind,at});
  state.evidence=state.evidence.slice(-120); c.attempts++;
  return kind;
}
