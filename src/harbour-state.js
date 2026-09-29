/** One shared harbour, optional in older expedition saves. No subject unlocks. */
export const TRACKS=['sets','python','web','digital','computing'];
export const CRATES=[
  {id:'lens',name:'Glass lens',a:true,b:true,symbol:'◈'},
  {id:'lantern',name:'Paper lantern',a:true,b:false,symbol:'✧'},
  {id:'chart',name:'Sky chart',a:false,b:true,symbol:'▧'},
  {id:'ribbon',name:'Ribbon spool',a:false,b:false,symbol:'◎'}
];
export const ORDERS=[
  {id:'observation',name:'Nova’s first observation',place:'observatory',direction:'north',label:'chart',rule:'b',distance:3,description:'Nova needs the survey kit: every crate in B. Bring it to the north Observatory.',reward:'Nova charts a quiet light beyond the harbour. Her sky chart stays on the noticeboard.'},
  {id:'garden',name:'Mira’s garden evening',place:'garden',direction:'west',label:'garden',rule:'difference',distance:2,description:'Mira needs fragile items that are NOT survey equipment: A ∖ B. Deliver them to the west garden.',reward:'Mira lights the garden paths. The garden stays open as a place to visit.'},
  {id:'opening',name:'Orin’s shared opening night',place:'observatory',direction:'north',label:'chart',rule:'union',distance:4,description:'Orin needs fragile OR survey items, including anything in both groups: A ∪ B. Take them north.',reward:'The harbour gathers under your lights. All your systems remain available for the next expedition.'}
];
export const orderById=id=>ORDERS.find(o=>o.id===id)||ORDERS[0];
export const OPERATIONS=['manual','a','b','union','intersection','difference','complement'];
export function selectCrates(rule){
  return CRATES.filter(c=>({a:c.a,b:c.b,union:c.a||c.b,intersection:c.a&&c.b,difference:c.a&&!c.b,complement:!c.a}[rule])).map(c=>c.id);
}
export const sameItems=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
export function gateValue(gate,a,b){return gate==='and'?a&&b:gate==='or'?a||b:gate==='a'?a:gate==='not-a'?!a:false;}
export function newHarbour(){return {
  version:1,order:'observation',selected:[],sorter:'manual',code:'# A variable is a name for a value.\n# Set energy below, then run the charger.\nenergy = 0\n',pods:3,leak:1,
  gate:'off',clear:true,scanner:'unplugged',processor:'unplugged',memory:false,screen:[],archive:[],
  deliveries:[],journal:[],stage:'idle',journey:null,position:{x:.49,y:.72},
  guides:Object.fromEntries(TRACKS.map(k=>[k,{step:0,opened:false,used:false}])),welcomed:false
};}
const fail=()=>{throw Error('Invalid harbour save. The existing save has not been replaced.');};
export function validateHarbour(raw){
  if(raw===undefined)return newHarbour();
  if(!raw||raw.version!==1)throw Error('Unsupported harbour save version. Use a matching game build; the existing save is unchanged.');
  const out=newHarbour();
  const choices={order:ORDERS.map(o=>o.id),sorter:OPERATIONS,gate:['off','and','or','a','not-a'],scanner:['unplugged','processor','display'],processor:['unplugged','display','storage'],stage:['idle','travelling','arrived','blocked']};
  for(const [key,values] of Object.entries(choices)){if(!values.includes(raw[key]))fail();out[key]=raw[key];}
  const lists={selected:CRATES.map(c=>c.id),screen:CRATES.map(c=>c.id),archive:CRATES.map(c=>c.id),deliveries:ORDERS.map(o=>o.id)};
  for(const [key,values] of Object.entries(lists)){
    if(!Array.isArray(raw[key])||raw[key].length>values.length||raw[key].some(v=>!values.includes(v)))fail();
    out[key]=[...new Set(raw[key])];
  }
  if(typeof raw.code!=='string'||raw.code.length>18000)fail();out.code=raw.code;
  for(const key of ['pods','leak']){if(!Number.isInteger(raw[key])||raw[key]<0||raw[key]>8)fail();out[key]=raw[key];}
  for(const key of ['clear','memory','welcomed']){if(typeof raw[key]!=='boolean')fail();out[key]=raw[key];}
  if(!Array.isArray(raw.journal)||raw.journal.length>60||raw.journal.some(v=>typeof v!=='string'||v.length>600))fail();out.journal=[...raw.journal];
  for(const key of TRACKS){const g=raw.guides?.[key];if(g){if(!Number.isInteger(g.step)||g.step<0||g.step>5)fail();out.guides[key]={step:g.step,opened:g.opened===true,used:g.used===true};}}
  if(raw.position&&Number.isFinite(raw.position.x)&&Number.isFinite(raw.position.y))out.position={x:Math.max(.05,Math.min(.95,raw.position.x)),y:Math.max(.1,Math.min(.94,raw.position.y))};
  if(raw.journey!=null){const j=raw.journey;
    if(!ORDERS.some(o=>o.id===j.order)||!['north','west','unknown'].includes(j.direction)||!Number.isInteger(j.cursor)||j.cursor<0||!Array.isArray(j.events)||j.events.length>25||j.cursor>j.events.length||typeof j.success!=='boolean')fail();
    const events=j.events.map(e=>{if(!e||typeof e.text!=='string'||e.text.length>600||!Number.isFinite(e.progress)||e.progress<0||e.progress>1||typeof e.ok!=='boolean')fail();return {text:e.text,progress:e.progress,ok:e.ok};});
    out.journey={order:j.order,direction:j.direction,cursor:j.cursor,success:j.success,events};
  }
  if(out.stage==='travelling'&&!out.journey)fail();
  return out;
}
export function logEvent(h,text){h.journal.push(text.slice(0,600));h.journal=h.journal.slice(-60);}
export function scanManifest(h){
  h.screen=[];
  if(h.scanner!=='processor')return {ok:false,text:h.scanner==='display'?'The display receives raw scanner pulses, not a processed crate list. Route input through the processor.':'The scanner is unplugged. No crate data reaches the processor.'};
  if(h.processor==='display'){h.screen=[...h.selected];if(h.memory)h.archive=[...h.selected];return {ok:true,text:'Processed '+h.screen.length+' crate IDs → display'+(h.memory?' and storage.':'. This display is working memory; store a copy to recall it after switching off.')};}
  if(h.processor==='storage'){h.archive=[...h.selected];return {ok:false,text:'The crate list reached storage, but not the display. You can recall it, or connect the processor to the display.'};}
  return {ok:false,text:'The processor received the input, but its output cable is unplugged.'};
}
export function powerCycle(h){h.screen=[];return h.archive.length?'Display cleared. Your stored manifest remains; Recall restores it.':'Display cleared. No manifest was stored. Scan again or restore a saved copy.';}
export function cancelJourney(h){if(h.stage==='travelling'){h.stage='idle';h.journey=null;return true;}return false;}
/** Snapshot facts from the actual page and Python result. No lesson completion flags. */
export function planDelivery(h,page,python){
  const o=orderById(h.order),events=[],required=selectCrates(o.rule),direction=page.direction||'unknown';
  const add=(text,ok=true,progress=0)=>events.push({text,ok,progress});
  let success=false;
  const finish=()=>({order:o.id,direction,cursor:0,success,events});
  add('Nova reads your saved information page.');
  if(page.error){add(page.error,false);return finish();}
  add(page.message||'The page sends this delivery '+direction+'.');
  add('The computer displays: '+(h.screen.map(id=>CRATES.find(c=>c.id===id).name).join(', ')||'(empty)')+'.');
  if(!h.screen.length||!sameItems(h.screen,h.selected)){add('Pip cannot verify the load: the display is empty or still shows an older selection. Rescan the actual cargo.',false);return finish();}
  const loaded=h.selected.length>0,signal=gateValue(h.gate,loaded,h.clear);
  add('Signal inputs: loaded='+Number(loaded)+', clear='+Number(h.clear)+'. Your '+h.gate.toUpperCase()+' circuit outputs '+Number(signal)+'.');
  if(!signal){add('The signal is off. Pip waits at the dock. Change or inspect the circuit; no cargo is lost.',false);return finish();}
  if(!h.clear){add('Your circuit told Pip to leave while the channel was blocked. Pip stops at the barrier and returns. Try both input states on the signal bench.',false,.08);return finish();}
  if(python.error||typeof python.value!=='number'||!Number.isFinite(python.value)){add('The charger cannot use this result: '+(python.error||'energy must be a number, not text or True/False.'),false);return finish();}
  const energy=Math.max(0,Math.min(12,python.value));
  add('Your program produced energy='+python.value+'. Battery holds '+energy+' of 12 units. Loading costs '+h.selected.length+' units.');
  let remaining=energy-h.selected.length;
  if(remaining<0){add('Not enough energy to lift these crates. Pip stays at the dock; your cargo is safe.',false);return finish();}
  const distance=direction==='west'?2:o.distance;
  for(let i=1;i<=distance;i++){
    if(remaining<1){add('Battery empty before route segment '+i+'. Pip returns with the cargo. Inspect the code or charge inputs.',false,(i-1)/distance);return finish();}
    remaining--;add('Pip crosses segment '+i+'/'+distance+' '+direction+'. Energy remaining: '+remaining+'.',true,i/distance);
  }
  if(direction!==o.direction){add('The page sent Pip '+direction+', but '+o.name+' needs '+o.direction+'. The receiving station sends the delivery back.',false,1);return finish();}
  const missing=required.filter(id=>!h.selected.includes(id)),extra=h.selected.filter(id=>!required.includes(id));
  if(missing.length||extra.length){add('The delivered set does not match the request. Missing: '+(missing.join(', ')||'none')+'. Extra: '+(extra.join(', ')||'none')+'. Everything returns safely for resorting.',false,1);return finish();}
  success=true;add(o.reward,true,1);return finish();
}
export function stepJourney(h){
  const j=h.journey;if(!j||j.cursor>=j.events.length)return null;
  const e=j.events[j.cursor++];
  if(j.cursor===j.events.length){
    h.stage=j.success?'arrived':'blocked';
    if(j.success&&!h.deliveries.includes(j.order)){h.deliveries.push(j.order);logEvent(h,orderById(j.order).reward);}
    else logEvent(h,(j.success?'Revisited: ':'Delivery paused: ')+e.text);
  }
  return e;
}
