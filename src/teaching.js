import {GUIDES} from './teaching-content.js';
import {parseSet,sameSet,setText} from './core.js';
import {previewDocument} from './web-workshop.js';
const guideEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guideValue=v=>v===true?'True':v===false?'False':String(v);
export function guideProgress(state,id){
  state.guides??={};
  return state.guides[id]??={step:0,finished:false,skipped:false};
}
/** Evaluate only the bounded warm-up task. Never eval learner strings. */
export function checkGuideAnswer(question,value){
  if(question.type==='number')return /^-?\d+(?:\.\d+)?$/.test(String(value).trim())&&Number(value)===question.answer;
  if(question.type==='set'){
    try{return sameSet(Array.isArray(value)?value:parseSet(String(value)),question.answer);}catch{return false;}
  }
  if(question.type==='html'){
    const doc=new DOMParser().parseFromString(String(value),'text/html');
    const nodes=[...doc.querySelectorAll(question.tag)];
    return nodes.some(n=>n.textContent.trim().replace(/\s+/g,' ')===question.content)&&new RegExp('</'+question.tag+'\\s*>','i').test(value);
  }
  return String(value).trim()===question.answer;
}
export class GuidedLesson{
  constructor(root,{getState,onChange,onSupport,onExit}){
    this.root=root;this.getState=getState;this.onChange=onChange;this.onSupport=onSupport;this.onExit=onExit;
  }
  open(id,{restart=false}={}){
    this.id=id;this.guide=GUIDES[id];if(!this.guide)return;
    const progress=guideProgress(this.getState(),id);
    this.index=restart?0:Math.min(progress.step,this.guide.steps.length-1);
    this.onSupport();this.root.hidden=false;this.render();
  }
  close(){this.root.hidden=true;}
  render(){
    const step=this.guide.steps[this.index],progress=guideProgress(this.getState(),this.id);
    progress.step=this.index;this.onChange();this.frame=0;this.answer='';this.tokens=new Set();this.accepted=!step.question;
    this.root.innerHTML=`<div class="guide-heading"><div><p class="eyebrow">LEARN FIRST · ${this.index+1} / ${this.guide.steps.length}</p><h3 tabindex="-1" id="guide-title">${guideEscape(step.title)}</h3></div><span class="guide-companion" aria-hidden="true">✧</span></div><p class="guide-intro">${guideEscape(step.text)}</p><div id="guide-demo"></div><div id="guide-question"></div><p id="guide-feedback" role="status" aria-live="polite"></p><div class="guide-controls"><button id="guide-back" class="outlined" ${this.index===0?'disabled':''}>← Back</button><button id="guide-next" class="primary">${this.index===this.guide.steps.length-1?'Try the experiment →':'Next small step →'}</button><button id="guide-skip" class="quiet">Go straight to the experiment</button></div><p class="guide-source">${guideEscape(this.guide.source)}</p><p class="guide-footnote">Walkthroughs and warm-ups are supported learning, not tests or mastery credit. Pause, replay, or ask to see a step’s answer.</p>`;
    this.demo(step);this.question(step.question);this.updateNext();
    this.root.querySelector('#guide-back').onclick=()=>{if(this.index>0){this.index--;this.render();}};
    this.root.querySelector('#guide-next').onclick=()=>{
      if(!this.accepted||this.frame<(step.frames?.length||1)-1)return;
      if(this.index<this.guide.steps.length-1){this.index++;this.render();}
      else{progress.finished=true;progress.skipped=false;this.onChange();this.close();this.onExit();}
    };
    this.root.querySelector('#guide-skip').onclick=()=>{progress.skipped=true;this.onChange();this.close();this.onExit();};
    this.root.closest('dialog')?.scrollTo(0,0);
    this.root.querySelector('#guide-title').focus({preventScroll:true});
  }
  updateNext(){
    const step=this.guide.steps[this.index];
    this.root.querySelector('#guide-next').disabled=!this.accepted||this.frame<(step.frames?.length||1)-1;
  }
  demo(step){
    const frame=step.frames?.[this.frame],container=this.root.querySelector('#guide-demo');let html='';
    if(step.board){
      const b=step.board;
      html+=`<div class="guide-board"><p>U = ${setText(b.U)} · A = ${setText(b.A)} · B = ${setText(b.B)}</p><div class="guide-members">`+b.U.map(n=>`<div class="guide-member ${frame?.focus===n?'focus':''}"><strong>${n}</strong><span>${b.A.includes(n)?'in A':'not in A'}</span><span>${b.B.includes(n)?'in B':'not in B'}</span></div>`).join('')+'</div>';
      if(frame)html+='<p class="guide-result">Result so far: '+setText(frame.result)+'</p>';
      html+='</div>';
    }
    if(step.code){html+='<pre class="guide-code">'+step.code.split('\n').map((line,i)=>`<span class="${frame?.line===i+1?'current':''}">${guideEscape(line)||' '}</span>`).join('')+'</pre>';}
    const values=frame?.values||step.values;
    if(values)html+='<div class="guide-values">'+Object.entries(values).map(([k,v])=>`<div><small>${guideEscape(k)}</small><strong>${guideEscape(guideValue(v))}</strong></div>`).join('')+'</div>';
    if(step.table)html+='<div class="guide-table"><table><thead><tr>'+step.table.headers.map(h=>'<th scope="col">'+guideEscape(h)+'</th>').join('')+'</tr></thead><tbody>'+step.table.rows.map(row=>'<tr>'+row.map(v=>'<td>'+guideEscape(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    if(frame)html+=`<p class="guide-caption" role="status">${guideEscape(frame.caption)}</p><div class="guide-trace-controls"><button id="guide-frame-back" class="outlined" ${this.frame===0?'disabled':''}>Previous part</button><span>Demonstration ${this.frame+1} / ${step.frames.length}</span><button id="guide-frame-next" class="outlined" ${this.frame===step.frames.length-1?'disabled':''}>Watch next part →</button></div>`;
    if(step.html)html+='<div class="guide-preview-label">BROWSER TAB: <span id="guide-tab-title"></span></div><iframe id="guide-page" class="guide-page" title="Worked example webpage" sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe>';
    container.innerHTML=html;
    if(step.html){container.querySelector('#guide-tab-title').textContent=new DOMParser().parseFromString(step.html,'text/html').title||'(not named yet)';container.querySelector('#guide-page').srcdoc=previewDocument(step.html,step.css||'');}
    if(frame){
      container.querySelector('#guide-frame-back').onclick=()=>{this.frame=Math.max(0,this.frame-1);this.demo(step);this.updateNext();};
      container.querySelector('#guide-frame-next').onclick=()=>{this.frame=Math.min(step.frames.length-1,this.frame+1);this.demo(step);this.updateNext();};
    }
  }
  question(q){
    if(!q)return;
    const box=this.root.querySelector('#guide-question');
    let body=`<p id="guide-prompt" class="guide-prompt">${guideEscape(q.prompt)}</p>`;
    if(q.type==='choice')body+='<div class="guide-choices">'+q.options.map(([v,label])=>`<button type="button" class="outlined" data-guide-choice="${guideEscape(v)}">${guideEscape(label)}</button>`).join('')+'</div>';
    else if(q.type==='set')body+='<div class="guide-choices">'+q.values.map(n=>`<button type="button" class="outlined guide-token" aria-pressed="false" data-token="${n}">${n}</button>`).join('')+'</div><p id="guide-selected">Selected: {}</p><button id="guide-submit" class="outlined">Check this small step</button>';
    else body+=`<label for="guide-answer" class="editor-label">${q.type==='html'?'Your HTML':'Your answer'}</label>${q.type==='html'?'<textarea id="guide-answer" spellcheck="false" maxlength="1000"></textarea><iframe id="guide-live" class="guide-page" title="Your small HTML practice" sandbox="allow-same-origin"></iframe>':'<input id="guide-answer" type="text" autocomplete="off" spellcheck="false" maxlength="100" '+(q.type==='number'?'inputmode="decimal"':'')+'>'}<button id="guide-submit" class="outlined">Check this small step</button>`;
    body+='<button id="guide-reveal" class="quiet">Show this step and explain it</button>';
    box.innerHTML=body;
    const submit=value=>{
      this.accepted=checkGuideAnswer(q,value);
      const feedback=this.root.querySelector('#guide-feedback');
      feedback.textContent=this.accepted?q.why:q.wrong+' Try again, or choose “Show this step”.';
      feedback.className=this.accepted?'guide-good':'guide-retry';this.updateNext();
    };
    box.querySelectorAll('[data-guide-choice]').forEach(b=>b.onclick=()=>submit(b.dataset.guideChoice));
    box.querySelectorAll('[data-token]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.token);this.tokens.has(n)?this.tokens.delete(n):this.tokens.add(n);b.setAttribute('aria-pressed',String(this.tokens.has(n)));box.querySelector('#guide-selected').textContent='Selected: '+setText([...this.tokens].sort((a,b)=>a-b));this.accepted=false;this.updateNext();});
    const input=box.querySelector('#guide-answer');
    if(input){input.oninput=()=>{this.accepted=false;this.updateNext();if(q.type==='html')box.querySelector('#guide-live').srcdoc=previewDocument(input.value,'');};input.onkeydown=e=>{if(e.key==='Enter'&&q.type!=='html'){e.preventDefault();submit(input.value);}};}
    if(box.querySelector('#guide-submit'))box.querySelector('#guide-submit').onclick=()=>submit(q.type==='set'?[...this.tokens]:input.value);
    box.querySelector('#guide-reveal').onclick=()=>{
      const answer=Array.isArray(q.answer)?setText(q.answer):q.answer;
      const feedback=this.root.querySelector('#guide-feedback');feedback.textContent='Worked step: '+answer+'. '+q.why;feedback.className='guide-good';
      this.accepted=true;this.updateNext();
      if(q.type==='html'){input.value=q.answer;box.querySelector('#guide-live').srcdoc=previewDocument(q.answer,'');}
    };
  }
}
