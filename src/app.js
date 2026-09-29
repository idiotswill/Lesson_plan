import {ISLANDS,LESSONS,SOURCES,lessonById,islandLessons} from './content.js';
import {loadSave,persist,parseSave,newSave,runState,seedFor,record,evidenceLabel,setCase,parseSet,setText,sameSet,expression,pythonCases,webSpec} from './core.js';
import {GuidedLesson,guideProgress} from './teaching.js';
import {World} from './world.js';
import {PythonRunner} from './python.js';
import {webStarter,previewDocument,checkWeb} from './web-workshop.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error('Storage blocked');},setItem(){throw Error('Storage blocked');}};}
const loaded=loadSave(storage);
let state=loaded.state,blocked=loaded.blocked||false,selectedIsland='sets',lesson=null,mode='adventure',data=null,chosen=new Set(),session=0,busy=false,previewVersion=0,saveTimer;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)state.calm=true;
const runner=new PythonRunner();
const guide=new GuidedLesson($('guided-teaching'),{
  getState:()=>state,onChange:()=>save(),
  onSupport:()=>{runState(state,lesson.id,mode).supported=true;save();},
  onExit:()=>{
    document.querySelector('.mission-layout').hidden=false;
    $('tutorial-status').textContent='The walkthrough remains available. Solving after help is supported practice, not independent proof.';
    $('mission').scrollTop=0;$('run-button').focus({preventScroll:true});
  }
});
function startGuide(restart=false){
  if(!lesson||busy)return;
  document.querySelector('.mission-layout').hidden=true;
  $('tutorial-status').textContent='One idea at a time. Worked examples are practice; the experiment checks your own work.';
  guide.open(lesson.id,{restart});
}
$('tutorial-replay').onclick=()=>startGuide(true);
function warning(message){$('storage-warning').hidden=!message;$('storage-warning').textContent=message;if(message)$('local-save-status').textContent='Memory only · export a backup';}
warning(loaded.warning);
function save(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{if(blocked)return;const message=persist(state,storage);warning(message);$('local-save-status').textContent=message?'Memory only · export a backup':'Saved on this device';},200);
}
window.addEventListener('pagehide',()=>{if(!blocked)persist(state,storage);});
const world=new World($('world'),state,selectIsland,save,message=>{$('world-message').textContent=message;});
let audio=null,sound=false;
function chime(){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();[392,493.88,587.33].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.12;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.04,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.6);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.65);});}catch{$('world-message').textContent='Audio is unavailable in this browser. Everything else still works.';}}
function applyCalm(){document.body.classList.toggle('calm',state.calm);$('calm-button').setAttribute('aria-pressed',String(state.calm));}
applyCalm();
$('calm-button').onclick=()=>{state.calm=!state.calm;applyCalm();save();};
$('sound-button').onclick=()=>{sound=!sound;$('sound-button').textContent=sound?'Sound on':'Sound off';$('sound-button').setAttribute('aria-pressed',String(sound));if(sound)chime();};
function drawDestinations(){
  $('destinations').innerHTML=ISLANDS.map(i=>`<button class="destination ${i.pending?'pending':''} ${i.id===selectedIsland?'active':''}" data-island="${i.id}" aria-pressed="${i.id===selectedIsland}"><strong>${escape(i.name)}</strong><small>${escape(i.course)}${i.pending?' · pending':''}</small></button>`).join('');
  $('destinations').querySelectorAll('button').forEach(b=>b.onclick=()=>world.sail(b.dataset.island));
}
function selectIsland(id){
  selectedIsland=id;const island=ISLANDS.find(i=>i.id===id);if(!island)return;
  const lessons=islandLessons(id),done=lessons.filter(l=>state.completed.includes(l.id)).length;
  $('island-course').textContent=island.course;$('island-name').textContent=island.name;$('island-symbol').textContent=island.symbol;
  document.querySelector('.island-panel').style.setProperty('--accent',island.colour);
  $('island-intro').textContent=island.intro;
  $('task-list').innerHTML=lessons.map((l,i)=>`<button class="task-button ${state.completed.includes(l.id)?'done':''}" data-lesson="${l.id}"><span class="task-number">${state.completed.includes(l.id)?'✓':i+1}</span>${escape(l.title)}<span aria-hidden="true">↗</span></button>`).join('');
  $('task-list').querySelectorAll('button').forEach(b=>b.onclick=()=>openLesson(b.dataset.lesson));
  $('island-reward').innerHTML=island.pending?'<p class="reward">Reserved for reviewed course materials. Not a playable module yet.</p>':`<p class="reward">${done===lessons.length?'✧ Rekindled:':'◇ Discover:'} ${escape(island.reward)} · ${done}/${lessons.length} experiments</p>`;
  const lanterns=ISLANDS.filter(i=>!i.pending&&islandLessons(i.id).every(l=>state.completed.includes(l.id))).length;
  $('lantern-count').textContent=lanterns+' / 3';$('ending-button').hidden=lanterns<3;
  drawDestinations();
}
selectIsland('sets');
const key=()=>lesson.id+':'+mode;
function draft(){
  if(!lesson)return;
  if(lesson.kind==='sets')state.drafts[key()]=mode==='adventure'?JSON.stringify([...chosen]):$('set-answer').value;
  else if(lesson.kind==='python')state.drafts[key()]=$('code-editor').value;
  else state.drafts[key()]=JSON.stringify({html:$('html-editor').value,css:$('css-editor').value});
  save();
}
function initialDraft(){return state.drafts[key()];}
function setFeedback(text,type=''){const f=$('feedback');f.textContent=text;f.className=type;}
function resetResult(){$('result-details').replaceChildren();setFeedback('');$('next-button').hidden=true;}
function setBusy(value){busy=value;['run-button','fresh-button','adventure-mode','check-mode','hint-button','solution-button','tutorial-replay'].forEach(id=>$(id).disabled=value);$('stop-button').hidden=!value||lesson?.kind!=='python';document.querySelectorAll('#work-area textarea,#work-area input,#work-area button.firefly').forEach(el=>el.disabled=value);}
function stopSession(){session++;runner.stop();setBusy(false);}
function openLesson(id,newMode='adventure'){
  stopSession();guide.close();document.querySelector('.mission-layout').hidden=false;lesson=lessonById(id);if(!lesson)return;mode=newMode;chosen=new Set();
  const src=SOURCES[lesson.source];
  $('mission-course').textContent=ISLANDS.find(i=>i.id===lesson.island).course;
  $('mission-title').textContent=lesson.title;$('mission-term').textContent=lesson.term;
  $('adventure-mode').setAttribute('aria-pressed',String(mode==='adventure'));$('check-mode').setAttribute('aria-pressed',String(mode==='check'));
  $('teach-box').hidden=mode==='check';$('source-details').open=false;
  $('mission-story').textContent=mode==='adventure'?lesson.story:'A fresh problem without the scene. Solve from a blank or minimal starting point. Hints remain available, but using one records this as supported practice.';
  $('mission-learn').textContent=lesson.learn;$('mission-example').textContent=lesson.example;
  $('source-detail').textContent=src.title+' — '+src.location+' '+src.note;
  $('hint-text').textContent=runState(state,id,mode).hints?'Support was used on this variation. Use New variation for a fresh check.':'';
  $('solution-text').hidden=true;$('solution-text').textContent='';
  $('evidence-label').textContent=evidenceLabel(state,id);resetResult();
  const seed=seedFor(state,id,mode);
  if(lesson.kind==='sets'){data=setCase(seed,lesson.op);renderSets();}
  else if(lesson.kind==='python'){data=pythonCases(id,seed,mode);renderPython();}
  else{data=webSpec(id,seed,mode);renderWeb();}
  $('run-button').textContent=mode==='check'?'Check my work':lesson.kind==='sets'?'Release the fireflies':'Run experiment';
  $('download-work').hidden=lesson.kind==='sets';
  if(!$('mission').open)$('mission').showModal();
  $('mission').scrollTop=0;
  const progress=guideProgress(state,id);
  $('tutorial-status').textContent=progress.finished?'Walkthrough visited · replay any time. This is not a mastery claim.':'New to this? Learn the pieces before the full problem.';
  if(mode==='adventure'&&!progress.finished&&!progress.skipped)startGuide();
  save();
}
function renderSets(){
  const saved=initialDraft();
  if(mode==='adventure'){try{chosen=new Set((JSON.parse(saved||'[]')).filter(n=>data.U.includes(n)));}catch{chosen=new Set();}}
  $('task-brief').textContent=(mode==='adventure'?'Select exactly the fireflies in ':'Write the set ')+expression(lesson.op)+'. U = '+setText(data.U)+'.';
  $('work-area').innerHTML=`<div class="input-line">A = ${setText(data.A)}\nB = ${setText(data.B)}</div>`;
  if(mode==='check'){
    $('work-area').insertAdjacentHTML('beforeend','<label class="editor-label" for="set-answer">Your set · braces optional · {} means empty</label><input id="set-answer" type="text" autocomplete="off" spellcheck="false" maxlength="200">');
    $('set-answer').value=saved||'';$('set-answer').oninput=draft;return;
  }
  const regions={a:[],b:[],both:[],neither:[]};for(const n of data.U){const a=data.A.includes(n),b=data.B.includes(n);regions[a&&b?'both':a?'a':b?'b':'neither'].push(n);}
  let buttons='';for(const [r,nums] of Object.entries(regions)){nums.forEach((n,i)=>{const x={a:23,b:77,both:50,neither:38+i*24}[r],y=r==='neither'?85:32+i*22;const member=r==='both'?'A + B':r==='neither'?'neither':r.toUpperCase();buttons+=`<button class="firefly ${chosen.has(n)?'selected':''}" data-number="${n}" style="left:${x}%;top:${y}%" aria-pressed="${chosen.has(n)}" aria-label="Firefly ${n}, member of ${member}"><i class="fly-light" aria-hidden="true"></i><strong>${n}</strong><small>${member}</small></button>`;});}
  $('work-area').insertAdjacentHTML('beforeend',`<div class="glade"><div class="ring"></div><div class="ring b"></div><span class="ring-label">A</span><span class="ring-label b">B</span>${buttons}</div><p class="set-selection" id="set-selection"></p>`);
  const label=()=>{$('set-selection').textContent='Selected: '+setText([...chosen].sort((a,b)=>a-b));};label();
  $('work-area').querySelectorAll('.firefly').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.number);chosen.has(n)?chosen.delete(n):chosen.add(n);b.classList.toggle('selected',chosen.has(n));b.setAttribute('aria-pressed',String(chosen.has(n)));document.querySelector('.glade').classList.remove('release');label();draft();});
}
function codeEditor(id){const el=$(id);el.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.shiftKey){e.preventDefault();el.setRangeText('    ',el.selectionStart,el.selectionEnd,'end');el.dispatchEvent(new Event('input'));}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('run-button').click();}});}
function renderPython(){
  const first=data[0].inputs,rate=first.rate;
  let brief=lesson.id==='py-energy'?`Inputs: pods and leak. Each pod contributes ${rate} units. Assign the remaining amount to energy.`:lesson.id==='py-decision'?'Inputs: wind, limit, charged. Assign True to fly only when charged is True and wind < limit; False otherwise.':'Input: stops (a non-negative integer). Use a while or for loop to assign the sum of 1 through stops to charge. For stops = 0, charge must be 0.';
  $('task-brief').textContent=brief+' The same program is tested with several inputs; do not overwrite the supplied inputs.';
  const stage=mode==='adventure'?'<div class="pip-stage"><div class="orchard-lights">'+Array.from({length:6},()=>'<span></span>').join('')+'</div><div class="pip"></div><small id="pip-caption">Pip is waiting to see what your program does.</small></div>':'';
  $('work-area').innerHTML=`<div class="input-line">First test inputs: ${escape(Object.entries(first).map(([name,value])=>name+' = '+pythonLiteral(value)).join(' · '))}</div>${stage}<label class="editor-label" for="code-editor">PYTHON 3 · Ctrl/⌘ + Enter to run · Tab inserts 4 spaces</label><textarea id="code-editor" spellcheck="false" autocomplete="off" autocapitalize="off" maxlength="18000"></textarea><p class="muted" style="font-size:10px;margin:8px 0">Real Python, not a simulated parser. First run downloads the runtime. Never paste untrusted code.</p>`;
  $('code-editor').value=initialDraft()??(mode==='check'?`# Output variable: ${lesson.output}\n`:lesson.starter.replace('worth 3','worth '+rate));
  $('code-editor').oninput=draft;codeEditor('code-editor');
}
function renderWeb(){
  const spec=data;
  $('task-brief').textContent=lesson.id==='web-structure'?`Use the exact browser title “${spec.title}”, one visible non-empty h1, and a visible non-empty paragraph. The wording and layout of your visible content are yours.`:lesson.id==='web-links'?`Create a visible text link to #${spec.target} and exactly one visible destination element with id="${spec.target}".`:`Keep at least two visible elements with class="${spec.className}". Using CSS, give both text colour ${spec.colour} and at least ${spec.padding}px padding on all four sides.`;
  $('work-area').innerHTML='<div class="web-editors"><div><label class="editor-label" for="html-editor">HTML</label><textarea id="html-editor" spellcheck="false" maxlength="14000"></textarea></div><div><label class="editor-label" for="css-editor">CSS</label><textarea id="css-editor" spellcheck="false" maxlength="4000"></textarea></div></div><div class="preview-label"><span>LIVE PAGE · scripts and remote resources disabled</span><button id="width-button" class="outlined" aria-pressed="false">Narrow preview</button></div><iframe id="web-preview" title="Your HTML and CSS preview" sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe>';
  let saved;try{saved=JSON.parse(initialDraft());}catch{}
  $('html-editor').value=typeof saved?.html==='string'?saved.html:webStarter(lesson,spec);$('css-editor').value=typeof saved?.css==='string'?saved.css:'';
  let timer;const update=()=>{draft();clearTimeout(timer);timer=setTimeout(()=>{if($('web-preview'))updatePreview().catch(()=>{});},250);};
  for(const id of ['html-editor','css-editor']){$(id).oninput=update;codeEditor(id);}
  $('width-button').onclick=()=>{const narrow=$('web-preview').classList.toggle('narrow');$('width-button').setAttribute('aria-pressed',String(narrow));$('width-button').textContent=narrow?'Wide preview':'Narrow preview';};
  updatePreview().catch(()=>{});
}
function updatePreview(){
  const frame=$('web-preview');if(!frame)return Promise.reject(new Error('Preview closed.'));
  const token=String(++previewVersion),html=$('html-editor').value,css=$('css-editor').value;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('The preview did not finish loading. Please run again.')),4000);
    frame.onload=()=>{if(frame.contentDocument?.documentElement.dataset.previewToken===token){clearTimeout(timer);resolve(frame.contentDocument);}};
    frame.srcdoc=previewDocument(html,css).replace('<html','<html data-preview-token="'+token+'"');
  });
}
function successMessage(){return mode==='check'?(runState(state,lesson.id,mode).supported||runState(state,lesson.id,mode).hints||runState(state,lesson.id,mode).attempts>1?'Correct. This was supported or corrected practice; use New variation for a fresh independent check.':'Fresh check passed without in-app help. This is evidence for this skill, not proof of course mastery.'):'It works. A little more of the world remembers what it was supposed to be. '+(runState(state,lesson.id,mode).supported?'This was practice after guided teaching. Try a fresh check later to see what you can do independently.':'');}
function finish(success,details=''){
  record(state,lesson.id,mode,success);save();
  setFeedback(success?successMessage():details,' '+(success?'success':'failure'));
  $('evidence-label').textContent=evidenceLabel(state,lesson.id);
  if(success){world.flash();chime();$('next-button').hidden=false;if(lesson.kind==='sets'&&mode==='adventure')document.querySelector('.glade').classList.add('release');}
  selectIsland(selectedIsland);
}
$('run-button').onclick=async()=>{
  if(busy)return;draft();resetResult();const ticket=session;
  if(lesson.kind==='sets'){
    try{const answer=mode==='adventure'?[...chosen]:parseSet($('set-answer').value),correct=sameSet(answer,data.expected);const missing=data.expected.filter(n=>!answer.includes(n)).length,extra=answer.filter(n=>!data.expected.includes(n)).length;const candidate=data.U.find(n=>answer.includes(n)!==data.expected.includes(n))??answer.find(n=>!data.U.includes(n));
      const membership=candidate===undefined?'':!data.U.includes(candidate)?`${candidate} is outside U, so it cannot enter this result.`:`${candidate} is ${data.A.includes(candidate)?'in':'not in'} A and ${data.B.includes(candidate)?'in':'not in'} B. ${lesson.learn}`;
      finish(correct,`${missing} required member(s) missing, ${extra} extra member(s). Let’s inspect one: ${membership} Use Teach me step by step to practise the rule first.`);}catch(e){record(state,lesson.id,mode,false);save();setFeedback(e.message,'failure');}return;
  }
  setBusy(true);
  try{
    if(lesson.kind==='web'){
      const doc=await updatePreview();if(ticket!==session)return;
      const checks=checkWeb(lesson,data,doc);$('result-details').innerHTML=checks.map(c=>`<div class="test-row ${c.ok?'ok':'bad'}">${c.ok?'✓':'○'} ${escape(c.message)}</div>`).join('');
      finish(checks.every(c=>c.ok),'The page renders, but some requirements are not met yet. See the checks below.');
    }else{
      const results=await runner.run({code:$('code-editor').value,output:lesson.output,requiresLoop:lesson.requiresLoop||false,cases:data.map(c=>c.inputs)},text=>{if(ticket===session)setFeedback(text);});
      if(ticket!==session)return;
      const checks=results.map((r,i)=>({...r,inputs:data[i].inputs,expected:data[i].expected,ok:!r.error&&typeof r.value===typeof data[i].expected&&r.value===data[i].expected}));
      const correct=checks.length===data.length&&checks.every(c=>c.ok);
      $('result-details').innerHTML=checks.map(c=>`<div class="test-row ${c.ok?'ok':'bad'}">${c.ok?'✓':'○'} ${escape(JSON.stringify(c.inputs))} → ${escape(c.error||JSON.stringify(c.value))}${c.ok?'':' · expected '+escape(JSON.stringify(c.expected))}${c.stdout?'<pre>'+escape(c.stdout)+'</pre>':''}</div>`).join('');
      if(mode==='adventure'){
        const first=checks[0],amount=typeof first.value==='boolean'?(first.value?1:0):Math.max(0,Math.min(1,Number(first.value)/Math.max(1,Number(first.expected))));
        document.querySelector('.pip').style.left=(10+(Number.isFinite(amount)?amount:0)*72)+'%';
        document.querySelector('.pip').style.top=first.value?'14px':'45px';
        $('pip-caption').textContent='Your first output: '+(first.error||JSON.stringify(first.value))+'. The animation illustrates this result; all test inputs still need to pass.';
        document.querySelectorAll('.orchard-lights span').forEach((el,i)=>el.classList.toggle('lit',i<amount*6));
        if(first.trace?.length)renderTrace(first.trace);
      }
      finish(correct,'One or more inputs produced a different result. Compare the supplied values, your output and the expected value below. Teach me step by step walks through how to build the instruction.');
    }
  }catch(e){if(ticket!==session)return;setFeedback(e.message,'failure');if(e.execution){record(state,lesson.id,mode,false);save();}}
  finally{if(ticket===session)setBusy(false);}
};
function renderTrace(trace){
  const box=document.createElement('details');box.className='trace';box.innerHTML='<summary>Inspect execution · first input</summary><p class="muted">A line event shows variables BEFORE that line executes. A return event shows the final state. At most 160 events are recorded.</p><label class="editor-label" for="trace-slider">Execution event</label><input id="trace-slider" type="range" min="0" max="'+(trace.length-1)+'" value="0"><pre id="trace-value"></pre>';
  $('result-details').append(box);const show=()=>{const n=Number($('trace-slider').value),t=trace[n];$('trace-value').textContent=`Event ${n+1}/${trace.length} · ${t.event==='return'?'finished at':'before'} line ${t.line}\n${JSON.stringify(t.values,null,2)}`;};$('trace-slider').oninput=show;show();
}
$('stop-button').onclick=()=>runner.stop();
$('hint-button').onclick=()=>{const run=runState(state,lesson.id,mode);run.hints=Math.min(3,run.hints+1);$('hint-text').textContent=lesson.hints[Math.min(run.hints-1,lesson.hints.length-1)];save();};
function workedSolution(){
  if(lesson.kind==='sets')return `${expression(lesson.op)} = ${setText(data.expected)}\n${lesson.learn}`;
  if(lesson.id==='py-energy')return `energy = pods * ${data[0].inputs.rate} - leak`;
  if(lesson.id==='py-decision')return 'fly = False\nif charged and wind < limit:\n    fly = True';
  if(lesson.id==='py-loop')return 'charge = 0\nstep = 1\nwhile step <= stops:\n    charge = charge + step\n    step = step + 1';
  if(lesson.id==='web-structure')return `<head><title>${data.title}</title></head>\n<body>\n  <h1>Welcome, wanderer</h1>\n  <p>This is a place for curious stars.</p>\n</body>`;
  if(lesson.id==='web-links')return `<a href="#${data.target}">Find the star</a>\n<h2 id="${data.target}">You are here</h2>`;
  return `.${data.className} {\n    color: ${data.colour};\n    padding: ${data.padding}px;\n}`;
}
$('solution-button').onclick=()=>{runState(state,lesson.id,mode).hints=3;$('solution-text').textContent=workedSolution();$('solution-text').hidden=false;$('hint-text').textContent='Solution revealed. This variation counts as supported practice, not independent evidence.';save();};
$('fresh-button').onclick=()=>{const run=runState(state,lesson.id,mode);run.variant++;run.attempts=0;run.hints=0;run.supported=false;delete state.drafts[key()];openLesson(lesson.id,mode);};
$('adventure-mode').onclick=()=>{draft();openLesson(lesson.id,'adventure');};$('check-mode').onclick=()=>{draft();openLesson(lesson.id,'check');};
$('next-button').onclick=()=>{const group=islandLessons(lesson.island),next=group.find(l=>!state.completed.includes(l.id));if(mode==='adventure'&&next)openLesson(next.id);else{$('mission').close();selectIsland(lesson.island);$('world-message').textContent=mode==='check'?'A fresh check is recorded in your journal. Come back another day to see what stayed.':'An island remembers its light. There are other places worth visiting.';}};
$('mission').addEventListener('close',stopSession);$('mission').addEventListener('cancel',stopSession);
document.querySelector('.close-mission').onclick=()=>$('mission').close();
function download(text,name,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function pythonLiteral(value){return value===true?'True':value===false?'False':JSON.stringify(value);}
$('download-work').onclick=()=>{
  draft();if(lesson.kind==='python')download('# Example inputs from The Unfinished World\n'+Object.entries(data[0].inputs).map(([k,v])=>`${k} = ${pythonLiteral(v)}`).join('\n')+'\n\n'+$('code-editor').value+`\nprint(${lesson.output})\n`,lesson.id+'.py','text/x-python');
  else download(previewDocument($('html-editor').value,$('css-editor').value),lesson.id+'.html','text/html');
};
function renderJournal(){
  $('journal-content').innerHTML=ISLANDS.map(i=>`<section class="journal-course"><h3>${escape(i.course)}</h3>${i.pending?'<p class="muted">Teaching materials pending; no learning claims yet.</p>':islandLessons(i.id).map(l=>`<div class="journal-entry"><div><strong>${escape(l.term)}</strong><small>${escape(evidenceLabel(state,l.id))}</small></div><button data-check="${l.id}">Fresh check ↗</button></div>`).join('')}</section>`).join('');
  $('journal-content').querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>{$('journal').close();const r=runState(state,b.dataset.check,'check');r.variant++;r.attempts=0;r.hints=0;r.supported=false;delete state.drafts[b.dataset.check+':check'];openLesson(b.dataset.check,'check');});
}
$('journal-button').onclick=()=>{renderJournal();$('journal').showModal();};
$('save-button').onclick=()=>$('settings').showModal();
$('export-button').onclick=()=>download(JSON.stringify(state,null,2),'unfinished-world-save.json');
$('import-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>500000)throw Error('Save file is too large (maximum 500 KB).');const next=parseSave(await file.text());if(!confirm('Replace this expedition with the imported save? Export your current save first if you need a backup.'))return;replaceState(next);$('settings-message').textContent='Save imported. Welcome back to your expedition.';}catch(error){$('settings-message').textContent=error.message;}finally{e.target.value='';}
};
function replaceState(next){stopSession();state=next;blocked=false;world.state=state;world.boat={...state.position};world.target=null;applyCalm();selectIsland(selectedIsland);save();}
$('reset-button').onclick=()=>{if(confirm('Start a new expedition and replace this browser save? This does not delete any exported backups.')){replaceState(newSave());$('settings-message').textContent='A new boat, a new beginning.';}};
$('ending-button').onclick=()=>{state.ending=true;save();world.flash();chime();$('ending').showModal();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('begin-button').onclick=()=>{$('welcome').close();$('world').focus();};
if(!state.completed.length&&!state.evidence.length)$('welcome').showModal();
// Nothing is exposed as a mutation/debug API. Browser tests exercise the actual UI.
