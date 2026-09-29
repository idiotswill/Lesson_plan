import {loadSave,persist,parseSave,newSave,SAVE_KEY} from './core.js';
import {STATIONS,stationById} from './harbour-content.js';
import {CRATES,ORDERS,TRACKS,selectCrates,gateValue,scanManifest,powerCycle,planDelivery,stepJourney,cancelJourney,orderById,sameItems} from './harbour-state.js';
import {readHarbourPage} from './harbour-page-reader.js';
import {HarbourWorld} from './harbour-world.js';
import {PythonRunner} from './python.js';
import {observatoryPreview,appendElement,destinationFor} from './observatory-engine.js';
import {mountObservatory,downloadText} from './observatory.js';
const $=id=>document.getElementById(id),esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error('Storage blocked');},setItem(){throw Error('Storage blocked');}};}
const loaded=loadSave(storage);let state=loaded.state,blocked=loaded.blocked||false,station='web',saveTimer,readerTimer,readerDoc=null,readerTicket=0,modelVersion=0,autoTimer=null,mounted=false,destroyObservatory=null,busy=false,battery=null,trace=[];
const runner=new PythonRunner(),h=()=>state.harbour;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)state.calm=true;
function warn(message){$('save-warning').textContent=message;$('save-warning').hidden=!message;}
warn(loaded.warning);
function flush(){clearTimeout(saveTimer);saveTimer=null;const warning=blocked?loaded.warning:persist(state,storage);warn(warning);$('save-status').textContent=warning?'Not saved here · export a backup':'Saved on this device';}
function save(){$('save-status').textContent='Saving…';if(!saveTimer)saveTimer=setTimeout(flush,180);}
function stopAuto(){clearInterval(autoTimer);autoTimer=null;$('play').textContent='Play journey';}
function changed(track){
  modelVersion++;runner.stop();busy=false;$('dispatch').disabled=false;
  stopAuto();if(cancelJourney(h()))$('journey-message').textContent='Your system changed. Pip returned safely; send a fresh journey with this version.';
  if(track&&h().guides[track])h().guides[track].used=true;
  save();refreshStatus();
}
const world=new HarbourWorld($('harbour-scene'),()=>state,chooseStation,save);
function calm(){document.body.classList.toggle('calm',state.calm);$('calm-button').setAttribute('aria-pressed',String(state.calm));}
calm();$('calm-button').onclick=()=>{state.calm=!state.calm;calm();save();};
function stationButtons(){
  $('station-buttons').innerHTML=STATIONS.map(s=>`<button data-station="${s.id}" aria-pressed="${s.id===station}"><span aria-hidden="true">${esc(s.symbol)}</span>${esc(s.subject)}<small>${h().guides[s.id].used?'Used in harbour':'Start from basics'}</small></button>`).join('');
  $('station-buttons').querySelectorAll('button').forEach(b=>b.onclick=()=>chooseStation(b.dataset.station,true));
}
function chooseStation(id,focus=false){
  station=id;world.selected=id;world.target={x:stationById(id).x,y:stationById(id).y+.09};h().guides[id].opened=true;
  const s=stationById(id);$('work-subject').textContent=s.subject+' / '+s.person;$('work-title').textContent=s.name;$('work-symbol').textContent=s.symbol;$('work-purpose').textContent=s.purpose;
  $('scene-message').textContent=s.person+' · '+s.purpose;$('work-feedback').textContent='';
  teach();renderControls();stationButtons();save();
  if(focus&&matchMedia('(max-width:780px)').matches)$('work-title').scrollIntoView({behavior:state.calm?'auto':'smooth',block:'start'});
}
function teach(){
  const s=stationById(station),g=h().guides[station],i=Math.min(g.step,s.lessons.length-1),lesson=s.lessons[i];
  $('teach-title').textContent=lesson.title;$('teach-position').textContent=(i+1)+' / '+s.lessons.length+' ideas';$('teach-text').textContent=lesson.text;$('teach-example').textContent=lesson.example;$('teach-try').textContent=lesson.try;$('example').open=false;
  $('teach-back').disabled=i===0;$('teach-next').disabled=i===s.lessons.length-1;
}
$('teach-back').onclick=()=>{h().guides[station].step=Math.max(0,h().guides[station].step-1);teach();save();};
$('teach-next').onclick=()=>{h().guides[station].step=Math.min(stationById(station).lessons.length-1,h().guides[station].step+1);teach();save();};
function feedback(text){$('work-feedback').textContent=text;}
function selectHTML(id,items,value){return `<select id="${id}">${items.map(([v,label])=>`<option value="${v}" ${v===value?'selected':''}>${esc(label)}</option>`).join('')}</select>`;}
function refreshStatus(){
  const s=h(),read=readerDoc?readHarbourPage(readerDoc,orderById(s.order)):{error:true};
  const bits=[['Cargo',s.selected.length>0],['Page',!read.error],['Manifest',s.screen.length>0&&sameItems(s.screen,s.selected)],['Signal',gateValue(s.gate,s.selected.length>0,s.clear)]];
  $('readiness').innerHTML=bits.map(([label,ok])=>`<span class="${ok?'ready':''}">${ok?'●':'○'} ${label}</span>`).join('')+'<span>Python runs at dispatch</span>';
  $('world-weather').textContent=s.clear?'Channel open':'Channel blocked';
  $('order').value=s.order;$('order-description').textContent=orderById(s.order).description;
  $('step').hidden=$('play').hidden=s.stage!=='travelling';$('return-pip').hidden=!s.journey;
  const j=s.journey;$('journey-progress').firstElementChild.style.width=(j?j.cursor/j.events.length*100:0)+'%';
  if(j&&j.cursor)$('journey-message').textContent=j.events[j.cursor-1].text;
  if(read.title)world.pageTitle=read.title;
  stationButtons();
}
function makeReader(){
  clearTimeout(readerTimer);
  const ticket=++readerTicket;readerDoc=null;
  const old=$('harbour-reader');old?.remove();
  const frame=document.createElement('iframe');frame.id='harbour-reader';frame.title='Internal rendered-page reader';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.setAttribute('sandbox','allow-same-origin');
  frame.style.cssText='position:fixed;left:-12000px;top:0;width:480px;height:280px;border:0;pointer-events:none';
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{if(ticket===readerTicket)reject(Error('The terminal did not render. Open the web workstation and retry.'));else resolve(null);},4000);
    frame.onload=()=>{clearTimeout(timer);if(ticket!==readerTicket){resolve(null);return;}readerDoc=frame.contentDocument;world.pageTitle=readerDoc?.querySelector('h1')?.textContent||'An unnamed place';refreshStatus();resolve(readerDoc);};
    frame.srcdoc=observatoryPreview(state.observatory.html,state.observatory.css);document.body.append(frame);
  });
}
function refreshReader(){clearTimeout(readerTimer);readerTimer=setTimeout(()=>makeReader().catch(e=>feedback(e.message)),200);}
function visiblePreview(){
  const frame=$('page-preview');if(!frame)return;
  frame.onload=()=>{frame.contentDocument?.addEventListener('click',event=>{
    const a=event.target.closest?.('a');if(!a)return;event.preventDefault();const d=destinationFor(frame.contentDocument,a.getAttribute('href'));if(d.error)feedback(d.error);else{d.element.scrollIntoView({block:'center'});feedback('This link reached #'+d.id+'.');}
  });};frame.srcdoc=observatoryPreview(state.observatory.html,state.observatory.css);
}
function renderControls(){
  const root=$('controls'),s=h();
  if(station==='sets'){
    root.innerHTML=`<p class="muted">U = all four crates · A = fragile · B = survey kit</p><div class="crate-grid">${CRATES.map(c=>`<button class="crate" data-crate="${c.id}" aria-pressed="${s.selected.includes(c.id)}"><span class="crate-symbol">${c.symbol}</span><strong>${c.name}</strong><small>${c.a?'A · fragile':'not A'} / ${c.b?'B · survey':'not B'}</small><small>${s.selected.includes(c.id)?'On Pip’s tray':'In the cargo yard'}</small></button>`).join('')}</div><label class="control-label" for="sorter">Reusable sorter · evaluates every crate</label>${selectHTML('sorter',[['manual','Manual selection'],['a','A · fragile'],['b','B · survey'],['union','A ∪ B · fragile OR survey'],['intersection','A ∩ B · fragile AND survey'],['difference','A ∖ B · fragile NOT survey'],['complement','U ∖ A · everything NOT fragile']],s.sorter)}<p class="muted">Tray = {${s.selected.join(', ')}}. Changing the tray does not silently rescan the computer.</p>`;
    root.querySelectorAll('[data-crate]').forEach(b=>b.onclick=()=>{const id=b.dataset.crate;s.selected=s.selected.includes(id)?s.selected.filter(x=>x!==id):[...s.selected,id];s.sorter='manual';changed('sets');renderControls();});
    $('sorter').onchange=()=>{s.sorter=$('sorter').value;if(s.sorter!=='manual')s.selected=selectCrates(s.sorter);changed('sets');renderControls();feedback('This rule moved the matching crates onto the tray. The other systems kept their settings.');};
  }else if(station==='python'){
    root.innerHTML=`<div class="row"><div><label class="control-label" for="pods">pods · 3 units each</label><input id="pods" type="number" min="0" max="8" value="${s.pods}"></div><div><label class="control-label" for="leak">leak · units lost</label><input id="leak" type="number" min="0" max="8" value="${s.leak}"></div></div><label class="control-label" for="harbour-code">Your Python instructions · output variable: energy</label><textarea id="harbour-code" maxlength="18000" spellcheck="false" autocapitalize="off"></textarea><p class="muted">Real local Python · Tab leaves the editor · Ctrl/⌘+Enter runs it.</p><div class="row"><button id="run-charger" class="primary">Run the charger</button><button id="stop-code">Stop</button><button id="export-code">Export code</button></div><div class="battery"><i id="battery-fill"></i><span id="battery-label"></span></div><details><summary>Inspect the actual execution</summary><p class="muted">Line values are BEFORE execution; return values are final.</p><pre id="code-trace"></pre></details>`;
    $('harbour-code').value=s.code;
    $('harbour-code').oninput=()=>{s.code=$('harbour-code').value;battery=null;trace=[];changed('python');paintBattery();};
    $('harbour-code').onkeydown=event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();runCharger();}};
    for(const id of ['pods','leak'])$(id).onchange=()=>{s[id]=Math.max(0,Math.min(8,Math.trunc(Number($(id).value)||0)));$(id).value=s[id];battery=null;changed('python');paintBattery();};
    $('run-charger').onclick=runCharger;$('stop-code').onclick=()=>{modelVersion++;runner.stop();busy=false;$('dispatch').disabled=false;feedback('Stopped. Your instructions are kept.');};
    $('export-code').onclick=()=>downloadText(`pods = ${s.pods}\nleak = ${s.leak}\n\n${s.code}\nprint(energy)\n`,'pips-charger.py','text/x-python');paintBattery();
  }else if(station==='digital'){
    const a=s.selected.length>0,b=s.clear;
    root.innerHTML=`<div class="signal-row"><span><i class="lamp ${a?'on':''}"></i>loaded = ${Number(a)}</span><span><i class="lamp ${b?'on':''}"></i>clear = ${Number(b)}</span><span><i class="lamp ${gateValue(s.gate,a,b)?'on':''}"></i>output = ${Number(gateValue(s.gate,a,b))}</span></div><label class="control-label" for="gate">Departure circuit</label>${selectHTML('gate',[['off','Disconnected · always 0'],['and','AND · both inputs'],['or','OR · at least one'],['a','Wire loaded directly'],['not-a','NOT loaded']],s.gate)}<div class="row"><button id="channel" aria-pressed="${s.clear}">${s.clear?'Close the channel':'Open the channel'}</button></div><p class="muted">The table is a separate test bench. The highlighted row is the harbour’s actual state.</p><table class="truth-table"><thead><tr><th>loaded</th><th>clear</th><th>Your output</th><th>Safe departure</th></tr></thead><tbody>${[0,1].flatMap(x=>[0,1].map(y=>`<tr class="${a===!!x&&b===!!y?'current':''}"><td>${x}</td><td>${y}</td><td>${Number(gateValue(s.gate,!!x,!!y))}</td><td>${x&&y}</td></tr>`)).join('')}</tbody></table>`;
    $('gate').onchange=()=>{s.gate=$('gate').value;changed('digital');renderControls();};
    $('channel').onclick=()=>{s.clear=!s.clear;changed('digital');renderControls();feedback(s.clear?'The barrier is open. Your circuit still decides whether Pip may depart.':'The barrier is closed. Does your circuit incorrectly tell Pip to leave?');};
  }else if(station==='computing'){
    root.innerHTML=`<div class="pipeline"><span>① Scanner / input</span>→<span>② Processor</span>→<span>③ Display / output</span></div><label class="control-label" for="scanner">Scanner cable goes to…</label>${selectHTML('scanner',[['unplugged','Unplugged'],['processor','Processor'],['display','Display directly']],s.scanner)}<label class="control-label" for="processor">Processor output goes to…</label>${selectHTML('processor',[['unplugged','Unplugged'],['display','Display'],['storage','Storage only']],s.processor)}<div class="row"><button id="memory" aria-pressed="${s.memory}">${s.memory?'Storage copy ON':'Storage copy OFF'}</button><button id="scan" class="primary">Scan current cargo</button></div><label class="control-label">Pip reads this display before leaving</label><div class="manifest">${s.screen.length?s.screen.map(id=>esc(CRATES.find(c=>c.id===id).name)).join('<br>'):'[no manifest on screen]'}</div><p class="muted">Stored copy: {${s.archive.join(', ')}}. It may describe an earlier load.</p><div class="row"><button id="power">Switch computer off</button><button id="recall">Recall stored copy</button></div>`;
    for(const id of ['scanner','processor'])$(id).onchange=()=>{s[id]=$(id).value;changed('computing');};
    $('memory').onclick=()=>{s.memory=!s.memory;changed('computing');renderControls();};
    $('scan').onclick=()=>{const result=scanManifest(s);changed('computing');renderControls();feedback(result.text);};
    $('power').onclick=()=>{const text=powerCycle(s);changed('computing');renderControls();feedback(text);};
    $('recall').onclick=()=>{s.screen=[...s.archive];changed('computing');renderControls();feedback(s.screen.length?'Stored data returned to the display. Check that it still matches the tray.':'There is no stored copy.');};
  }else{
    root.innerHTML=`<label class="control-label" for="label-words">Label press · your words</label><input id="label-words" type="text" maxlength="200" placeholder="Name your harbour, or write directions"><div class="row"><button id="add-h1">Make a heading</button><button id="add-p">Make a paragraph</button></div><label class="control-label" for="harbour-html">Your HTML · the SAME saved Observatory page</label><textarea id="harbour-html" maxlength="18000" spellcheck="false" autocapitalize="off"></textarea><details><summary>CSS · appearance</summary><label class="control-label" for="harbour-css">CSS source · full teaching in the workbench</label><textarea id="harbour-css" maxlength="6000" spellcheck="false"></textarea></details><iframe id="page-preview" title="Your actual saved Observatory page" sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe><p class="muted">Visitor rule: use a visible “chart” or “garden” link when available; otherwise read the first visible paragraph. The destination must say north OR west. This is a fictional rule, not general text understanding.</p><div class="row"><button id="inspect-page">Ask Nova to read it</button><button id="full-workshop" class="primary">Full Observatory workbench ↗</button></div>`;
    $('harbour-html').value=state.observatory.html;$('harbour-css').value=state.observatory.css;
    for(const [id,key] of [['harbour-html','html'],['harbour-css','css']])$(id).oninput=()=>{state.observatory[key]=$(id).value;changed('web');refreshReader();visiblePreview();};
    for(const [id,tag] of [['add-h1','h1'],['add-p','p']])$(id).onclick=()=>{const words=$('label-words').value.trim();if(!words){feedback('Write some words first. Then choose whether they are a heading or a paragraph.');return;}const next=appendElement(state.observatory.html,tag,words);if(next.length>18000){feedback('The page has reached its size limit. Edit the existing text instead.');return;}state.observatory.html=next;$('harbour-html').value=next;changed('web');refreshReader();visiblePreview();feedback('Added real HTML: <'+tag+'>'+words+'</'+tag+'>. Your other elements are kept.');};
    $('inspect-page').onclick=async()=>{try{const doc=await makeReader();if(!doc)return;const result=readHarbourPage(doc,orderById(h().order));feedback(result.error||result.message);}catch(e){feedback(e.message);}};
    $('full-workshop').onclick=openObservatory;visiblePreview();
  }
}
function paintBattery(){
  world.battery=battery;
  if(!$('battery-label'))return;
  $('battery-fill').style.width=(typeof battery==='number'?Math.max(0,Math.min(12,battery))/12*100:0)+'%';
  $('battery-label').textContent=typeof battery==='number'?'Program output '+battery+' · battery '+Math.max(0,Math.min(12,battery))+'/12':'Run your program to measure the battery';
  $('code-trace').textContent=trace.map(t=>(t.event==='return'?'Finished':'Before line '+t.line)+' · '+JSON.stringify(t.values)).join('\n')||'No execution trace yet.';
}
async function executeCharger(status){const s=h();const result=await runner.run({code:s.code,output:'energy',cases:[{pods:s.pods,leak:s.leak}]},status);return result[0];}
async function runCharger(){
  const version=modelVersion;
  try{const result=await executeCharger(feedback);if(version!==modelVersion)return;trace=result.trace||[];battery=typeof result.value==='number'?result.value:null;h().guides.python.used=true;save();paintBattery();refreshStatus();feedback(result.error||`Your code produced ${JSON.stringify(result.value)}. The battery is capped at 12, but dispatch uses this result—not an answer checker.`);}
  catch(e){if(version===modelVersion)feedback(e.message);}
}
$('order').innerHTML=ORDERS.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('');
$('order').onchange=()=>{h().order=$('order').value;changed();$('journey-message').textContent='A different request, not a reset. Your page, code, cables and cargo are all still yours.';};
$('dispatch').onclick=async()=>{
  if(busy)return;stopAuto();runner.stop();cancelJourney(h());const version=modelVersion;busy=true;$('dispatch').disabled=true;$('journey-message').textContent='Nova reads the current page. Pip runs your saved Python against today’s inputs…';
  try{
    const doc=await makeReader();if(!doc||version!==modelVersion)return;
    const page=readHarbourPage(doc,orderById(h().order));let result={value:null,error:''};
    try{result=await executeCharger(text=>{$('journey-message').textContent=text;});}catch(e){result.error=e.message;}
    if(version!==modelVersion)return;
    battery=typeof result.value==='number'?result.value:null;trace=result.trace||[];paintBattery();
    h().journey=planDelivery(h(),page,result);h().stage='travelling';save();nextStep();
  }catch(e){if(version===modelVersion)$('journey-message').textContent=e.message;}
  finally{if(version===modelVersion){busy=false;$('dispatch').disabled=false;}}
};
function nextStep(){const event=stepJourney(h());if(!event){stopAuto();return;}save();refreshStatus();if(h().stage!=='travelling')stopAuto();}
$('step').onclick=nextStep;$('play').onclick=()=>{if(autoTimer){stopAuto();return;}$('play').textContent='Pause journey';autoTimer=setInterval(nextStep,state.calm?1300:1000);};
$('return-pip').onclick=()=>{stopAuto();h().journey=null;h().stage='idle';changed();$('journey-message').textContent='Pip and the crates are back. Your completed discoveries and all systems are kept.';};
function openObservatory(){
  if(h().stage==='travelling')changed();
  $('observatory').showModal();
  if(!mounted){destroyObservatory=mountObservatory($('po-root'),state.observatory,()=>{changed('web');refreshReader();},{calm:state.calm});mounted=true;}
}
function closeObservatory(){
  $('observatory').close();destroyObservatory?.();destroyObservatory=null;mounted=false;chooseStation('web');refreshReader();flush();
}
$('close-observatory').onclick=closeObservatory;
$('observatory').addEventListener('cancel',event=>{event.preventDefault();closeObservatory();});
$('journal-button').onclick=()=>{
  $('logbook-content').innerHTML='<h3>Your creations remain in use</h3>'+STATIONS.map(s=>`<div class="track-note"><strong>${esc(s.subject)}</strong><span>${h().guides[s.id].used?'Used in the harbour':h().guides[s.id].opened?'Foundation opened':'Available from the beginning'}</span></div>`).join('')+'<p class="muted">These are activity records, not independent mastery evidence. Teaching is always available. Separate practice stays in the Observatory and study desks.</p><h3>Discoveries and delivery history</h3>'+(h().journal.length?h().journal.slice().reverse().map(text=>'<p class="log-item">'+esc(text)+'</p>').join(''):'<p>Your first discovery is still ahead. All three requests are available now.</p>')+'<h3>What your harbour contains</h3><p>'+h().deliveries.length+' of 3 shared requests delivered. Your terminal, charger, cargo rules, signal and stored manifest are kept.</p>';
  $('logbook').showModal();
};
$('save-button').onclick=()=>$('settings').showModal();
$('export-save').onclick=()=>{flush();downloadText(JSON.stringify(state,null,2),'unfinished-world-save.json','application/json');};
function replace(next){stopAuto();runner.stop();state=next;blocked=false;busy=false;battery=null;trace=[];destroyObservatory?.();destroyObservatory=null;mounted=false;$('po-root').replaceChildren();modelVersion++;calm();chooseStation('web');makeReader().catch(e=>feedback(e.message));flush();refreshStatus();}
$('import-save').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>500000)throw Error('Save limit is 500 KB.');const next=parseSave(await file.text());if(!confirm('Replace this session with the imported save? Export the current save first to keep both.'))return;replace(next);$('settings-message').textContent='Imported. Your older activities and Observatory page are preserved.';}catch(e){$('settings-message').textContent=e.message;}finally{event.target.value='';}};
$('reset').onclick=()=>{if(confirm('Replace this browser expedition with a new one? Export a backup first to keep your work.')){replace(newSave());$('settings-message').textContent='A new local expedition has begun.';}};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
$('begin').onclick=()=>{h().welcomed=true;save();$('welcome').close();$('harbour-scene').focus();};
window.addEventListener('pagehide',()=>{stopAuto();runner.stop();flush();});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
window.addEventListener('storage',event=>{if(event.key===SAVE_KEY)warn('Another tab changed this expedition. Export unsaved work here, then reload. This tab will not overwrite the newer save.');});
chooseStation('web');makeReader().catch(e=>feedback(e.message));refreshStatus();if(!h().welcomed)$('welcome').showModal();
