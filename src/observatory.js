import {CHAPTERS,ASSESSMENTS,chapter} from './observatory-content.js';
import {beginCheck,recordCheck} from './observatory-state.js';
import {observatoryPreview,frameFragment,appendElement,destinationFor,planVisit} from './observatory-engine.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function downloadText(text,name,type='text/html') {
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
/** Mounts against the shared expedition save; no separate storage or remote service. */
export function mountObservatory(root,state,onChange,{calm=false}={}) {
  let renderTimer,previewTicket=0,visitTimer,queue=[],cursor=0,currentVisitors=[],currentDoc=null,undo=null;
  let autoPlay=false,visitGeneration=0;
  const $=id=>root.querySelector('#'+id);
  root.innerHTML=`
    <section class="po-heading"><div><p class="po-kicker">PAPER OBSERVATORY / THE VISITOR WORKSHOP</p><h1>A sky worth finding.</h1><p>A blank page. Four visitors. Make a place they can actually use.</p></div><div class="po-seal" aria-hidden="true">✧<small>YOUR OWN<br>OBSERVATORY</small></div></section>
    <nav id="po-chapters" class="po-chapters" aria-label="Workshop chapters"></nav>
    <div class="po-modebar"><span id="po-mode-label"></span><button id="po-desk">Separate practice desk</button><button id="po-return" hidden>Return to my observatory</button><button id="po-export-page">Export this page</button></div>
    <section class="po-brief"><p class="po-kicker" id="po-term"></p><h2 id="po-goal-title"></h2><p id="po-goal"></p><p id="po-context" class="po-muted"></p></section>
    <div class="po-layout">
      <aside class="po-companion" aria-label="Teaching and help">
        <div class="po-pip" aria-hidden="true">✦</div><h2>Pip’s workbench</h2>
        <p id="po-idea"></p><button id="po-help" hidden>Teach me this first</button>
        <div id="po-teaching"><div id="po-pieces"></div><p id="po-tip" class="po-tip"></p><button id="po-demo-button">Watch a different example</button></div>
        <section id="po-press"><h3>The label press</h3><p>Write your own words. Choose their role. Then look at the HTML the press adds.</p><label for="po-label">Words for your page</label><input id="po-label" maxlength="200" placeholder="Name your observatory"><div class="po-row"><button id="po-add-heading">Make a heading</button><button id="po-add-paragraph">Make a paragraph</button></div><button id="po-undo" hidden>Undo last press</button></section>
        <button id="po-frame" hidden>Add document frame</button>
        <p id="po-tool-note" class="po-muted" role="status"></p>
      </aside>
      <section class="po-workspace" aria-label="Your working page">
        <div class="po-browser"><div class="po-browser-bar"><span aria-hidden="true">● ● ●</span><strong id="po-tab">Untitled page</strong><button id="po-width" aria-pressed="false">Narrow view</button></div><div id="po-frame-slot" class="po-frame-slot"></div></div>
        <div class="po-runbar"><button id="po-invite" class="po-primary">Invite Pip</button><button id="po-step" hidden>Next observation</button><button id="po-play" hidden>Play journey</button><button id="po-finish" hidden>Show whole journey</button><button id="po-next" hidden>Try the next chapter →</button></div>
        <p id="po-feedback" class="po-feedback" role="status" aria-live="polite"></p>
        <div id="po-visitors" class="po-visitors" aria-label="Visitor journeys"></div>
        <section class="po-source"><div class="po-source-heading"><h2>Your instructions</h2><p>Change the source; watch the browser change the page.</p></div><div class="po-editors"><div><label for="po-html">HTML · the content and structure</label><textarea id="po-html" spellcheck="false" autocomplete="off" autocapitalize="off" maxlength="18000" aria-describedby="po-editor-help"></textarea></div><div id="po-css-wrap"><label for="po-css">CSS · the appearance</label><textarea id="po-css" spellcheck="false" autocomplete="off" autocapitalize="off" maxlength="6000"></textarea></div></div><p id="po-editor-help" class="po-muted">Type or edit freely. Tab leaves the editor; Ctrl/⌘ + Enter invites the visitors. Your draft is saved, including unfinished work.</p></section>
        <details class="po-limits"><summary>What this preview supports</summary><p>This is a restricted local HTML/CSS workshop, not the whole web. Use the separate CSS editor. Scripts, forms, inline styles, images and external assets or links are disabled. Internal # links work. The export is a safety-filtered, standalone HTML page with your CSS included. The browser can repair malformed HTML; a visitor pass is not a full syntax or accessibility audit.</p></details>
      </section>
    </div>
    <section class="po-record"><h2>What this journey records</h2><p id="po-progress"></p><div id="po-evidence"></div><p class="po-muted">Workshop completion records guided construction, not mastery. Practice records distinguish first submissions without in-app help from corrected, supported or repeated work. They cannot detect outside help. No retention or whole-course readiness claim is made.</p></section>
    <dialog id="po-demo" aria-labelledby="po-demo-title"><div class="po-dialog-top"><h2 id="po-demo-title">A different example</h2><button id="po-demo-close">Close example</button></div><p>Your own page is untouched. Read the source, then render it to see what each instruction makes.</p><pre id="po-demo-code"></pre><button id="po-demo-render" class="po-primary">Render this example</button><iframe id="po-demo-preview" title="Worked example, separate from your page" sandbox="allow-same-origin" referrerpolicy="no-referrer" hidden></iframe><p id="po-demo-why"></p></dialog>
    <dialog id="po-check-picker" aria-labelledby="po-check-title"><div class="po-dialog-top"><h2 id="po-check-title">The separate practice desk</h2><button id="po-picker-close">Keep building</button></div><p>Your observatory is kept safely. Each task has its own brief; the current practice draft is kept until you explicitly replace it with another task. No scenery or solution is supplied. Help is always available and is recorded.</p><div id="po-check-list"></div><button id="po-resume" hidden>Resume my practice draft</button></dialog>`;
  root.querySelector('.po-workspace').prepend($('po-press'));
  const pressSource=document.createElement('pre');pressSource.id='po-press-source';pressSource.hidden=true;$('po-press').append(pressSource);
  const draft=()=>state.mode==='check'?state.check:state;
  const assessment=()=>ASSESSMENTS.find(a=>a.id===state.check?.id);
  function support(){if(state.mode==='check'){state.check.assisted=true;onChange();}}
  function stopVisit(){clearTimeout(visitTimer);autoPlay=false;queue=[];cursor=0;visitGeneration++;$('po-step').hidden=$('po-play').hidden=$('po-finish').hidden=true;}
  function invalidate(message='Your page changed. Invite the visitors again to try this version.') {
    stopVisit();$('po-visitors').replaceChildren();$('po-feedback').textContent=message;$('po-next').hidden=true;
  }
  function changed(){
    const d=draft();d.html=$('po-html').value;d.css=$('po-css').value;onChange();invalidate();
    clearTimeout(renderTimer);renderTimer=setTimeout(()=>renderPreview().catch(reportError),220);
  }
  function reportError(error){$('po-feedback').textContent=error.message;}
  function renderPreview(){
    const ticket=++previewTicket;currentDoc=null;
    const frame=document.createElement('iframe');frame.title='Your actual HTML and CSS page';frame.setAttribute('sandbox','allow-same-origin');frame.referrerPolicy='no-referrer';
    const d=draft(),html=d.html,css=d.css;
    const promise=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{if(ticket===previewTicket)reject(Error('The preview took too long to load. Invite the visitors to retry.'));else resolve(null);},4000);
      frame.onload=()=>{
        clearTimeout(timeout);if(ticket!==previewTicket){resolve(null);return;}
        const doc=frame.contentDocument;if(!doc){reject(Error('The browser did not allow this local preview.'));return;}
        currentDoc=doc;$('po-tab').textContent=doc.title||'Untitled page';
        doc.addEventListener('click',e=>{
          const a=e.target.closest?.('a');if(!a)return;e.preventDefault();
          const target=destinationFor(doc,a.getAttribute('href'));
          if(target.error)$('po-feedback').textContent=target.error;
          else{target.element.scrollIntoView({block:'center'});$('po-feedback').textContent='Your link reached #'+target.id+'.';}
        });
        resolve(doc);
      };
      frame.srcdoc=observatoryPreview(html,css);$('po-frame-slot').replaceChildren(frame);
    });
    return promise;
  }
  function redrawChapters(){
    $('po-chapters').innerHTML=CHAPTERS.map(c=>`<button data-stage="${c.id}" aria-pressed="${state.mode==='workshop'&&state.stage===c.id}">${state.completed.includes(c.id)?'✓ ':''}${esc(c.short)}</button>`).join('');
    $('po-chapters').querySelectorAll('button').forEach(b=>b.onclick=()=>{
      if(state.mode==='check')support();state.mode='workshop';state.stage=b.dataset.stage;onChange();showMode();
    });
  }
  function teaching(id){
    const c=chapter(id);$('po-idea').textContent=c.idea;
    $('po-pieces').innerHTML=c.pieces.map(([code,meaning])=>`<details><summary><code>${esc(code)}</code></summary><p>${esc(meaning)}</p></details>`).join('');
    // First-time basics stay open. Later definitions are never locked behind failure.
    if(id==='paper')$('po-pieces').querySelector('details').open=true;
    $('po-tip').textContent=c.tip;$('po-teaching').dataset.chapter=id;
  }
  function records(){
    $('po-progress').textContent=state.completed.length+' of 5 workshop milestones visited successfully. Earlier mini-exercise progress remains separate.';
    $('po-evidence').replaceChildren();
    for(const e of state.evidence.slice(-8).reverse()) {
      const p=document.createElement('p');
      const kind={'first-unassisted':'first submission, no in-app help','supported':'supported or corrected practice','repeated':'repeated task, not fresh evidence'}[e.kind];
      p.textContent=(ASSESSMENTS.find(a=>a.id===e.id)?.name||e.id)+' — '+(e.success?'requirements met':'requirements not yet met')+' · '+kind;
      $('po-evidence').append(p);
    }
  }
  function showMode(){
    clearTimeout(renderTimer);stopVisit();undo=null;$('po-undo').hidden=true;$('po-tool-note').textContent='';pressSource.hidden=true;
    root.querySelectorAll('.po-help-nav').forEach(el=>el.remove());
    const check=state.mode==='check',c=chapter(state.stage),a=assessment(),d=draft();
    $('po-html').value=d.html;$('po-css').value=d.css;
    $('po-term').textContent=check?'SEPARATE PRACTICE / YOUR OWN WORK':c.term;
    $('po-goal-title').textContent=check?a.name:c.name;
    $('po-goal').textContent=check?a.brief:c.goal;
    $('po-context').textContent=check?'Your workshop page is untouched. A retry after feedback is recorded as corrected practice.':'One continuing page. Nothing is reset when you change chapters. All earlier teaching remains accessible.';
    $('po-mode-label').textContent=check?'Practice draft · not your observatory':'Your observatory · build, test, keep';
    $('po-desk').hidden=check;$('po-return').hidden=!check;$('po-help').hidden=!check;
    $('po-teaching').hidden=check;$('po-press').hidden=check||state.stage!=='paper';$('po-frame').hidden=check||state.stage!=='document';
    $('po-css-wrap').hidden=!check&&!['notices','opening'].includes(state.stage)&&!state.css;
    teaching(state.stage);
    if(check)$('po-idea').textContent='The desk keeps your work separate from the guided workshop. Read the brief, build or repair the page, then submit when ready. Help is never locked.';
    $('po-invite').textContent=check?'Submit this attempt':state.stage==='paper'?'Invite Pip':'Invite the visitors';
    $('po-next').hidden=true;$('po-visitors').replaceChildren();
    $('po-feedback').textContent=check?'No submission yet for this view. Your previous attempts, if any, are still recorded.':'Build at your own pace. The visitors will wait.';
    redrawChapters();records();renderPreview().catch(reportError);
  }
  function finishVisit(){
    clearTimeout(visitTimer);autoPlay=false;
    $('po-step').hidden=$('po-play').hidden=$('po-finish').hidden=true;
    const ok=currentVisitors.every(v=>v.ok);
    if(state.mode==='check') {
      const kind=recordCheck(state,ok);
      $('po-feedback').textContent=(ok?'This page meets the stated requirements. ':'Some requirements are not met yet. ')+(kind==='first-unassisted'?'Recorded as a first submission without in-app help.':kind==='repeated'?'Recorded as repeated practice, not a fresh check.':'Recorded as supported or corrected practice.');
    } else {
      if(ok&&!state.completed.includes(state.stage))state.completed.push(state.stage);
      $('po-feedback').textContent=ok?(state.stage==='opening'?'The observatory is open. This is your working page—keep it, change it, or export it.':'The visitors can use this version. Keep building on the same page.'):'A visitor got stuck. Inspect the last observation, repair your page, and invite them again. No progress is lost.';
      $('po-next').hidden=!ok||state.stage==='opening';
    }
    onChange();redrawChapters();records();
  }
  function step(){
    if(cursor>=queue.length)return;
    const {vi,ei}=queue[cursor++],visitor=currentVisitors[vi],observation=visitor.steps[ei];
    const card=$('po-visitor-'+vi),log=card.querySelector('ol'),line=document.createElement('li');
    line.textContent=observation.text;line.className=observation.ok?'':'po-problem';
    log.append(line);card.classList.toggle('po-blocked',!observation.ok);
    card.querySelector('.po-traveller').style.left=(ei/Math.max(1,visitor.steps.length-1)*88)+'%';
    card.querySelector('.po-journey-status').textContent=ei===visitor.steps.length-1?(visitor.ok?'Arrived':'Needs repair'):'Exploring';
    if(observation.target?.isConnected){
      currentDoc.querySelectorAll('[data-po-inspect]').forEach(el=>{el.removeAttribute('data-po-inspect');el.style.outline='';});
      observation.target.setAttribute('data-po-inspect','');observation.target.style.outline='2px dashed #735cb2';observation.target.scrollIntoView({block:'center'});
    }
    if(cursor===queue.length)finishVisit();
    else if(autoPlay)visitTimer=setTimeout(step,calm?250:850);
  }
  async function invite(){
    if($('po-invite').disabled)return;
    clearTimeout(renderTimer);stopVisit();$('po-feedback').textContent='Opening the current version of your page…';$('po-visitors').replaceChildren();
    const generation=visitGeneration;$('po-invite').disabled=true;
    try {
      await renderPreview();if(generation!==visitGeneration||!currentDoc)return;
      currentVisitors=planVisit(currentDoc,{stage:state.stage,html:draft().html,assessment:state.mode==='check'?assessment():null});
      if(state.mode==='check') {
        // A submission counts immediately, even if its report is interrupted by edits or navigation.
        const kind=recordCheck(state,currentVisitors.every(v=>v.ok));onChange();records();
        $('po-feedback').textContent='Attempt recorded ('+kind+'). Read the report below.';
        currentVisitors.forEach(v=>{
          const card=document.createElement('article');card.className='po-visitor'+(v.ok?'':' po-blocked');
          const h=document.createElement('h3');h.textContent=v.name+' · '+(v.ok?'requirements met':'needs repair');card.append(h);
          const list=document.createElement('ol');v.steps.forEach(e=>{const li=document.createElement('li');li.textContent=e.text;if(!e.ok)li.className='po-problem';list.append(li);});card.append(list);$('po-visitors').append(card);
        });
        return;
      }
      $('po-visitors').innerHTML=currentVisitors.map((v,i)=>`<article class="po-visitor" id="po-visitor-${i}"><header><h3>${esc(v.name)}</h3><span class="po-journey-status">Waiting</span></header><div class="po-track" aria-hidden="true"><span class="po-traveller">✦</span></div><ol></ol></article>`).join('');
      queue=currentVisitors.flatMap((v,vi)=>v.steps.map((_,ei)=>({vi,ei})));cursor=0;
      $('po-step').hidden=$('po-play').hidden=$('po-finish').hidden=false;$('po-play').textContent='Play journey';
      $('po-feedback').textContent='Follow each observation. The journey comes from this page’s actual elements, links and computed styles.';
      step();
    }catch(e){reportError(e);}finally{$('po-invite').disabled=false;}
  }
  $('po-invite').onclick=invite;
  $('po-step').onclick=()=>{clearTimeout(visitTimer);autoPlay=false;$('po-play').textContent='Play journey';step();};
  $('po-play').onclick=()=>{autoPlay=!autoPlay;clearTimeout(visitTimer);$('po-play').textContent=autoPlay?'Pause journey':'Play journey';if(autoPlay)step();};
  $('po-finish').onclick=()=>{clearTimeout(visitTimer);autoPlay=false;while(cursor<queue.length)step();};
  $('po-next').onclick=()=>{const i=CHAPTERS.findIndex(c=>c.id===state.stage);state.stage=CHAPTERS[Math.min(i+1,4)].id;onChange();showMode();$('po-goal-title').scrollIntoView({block:'start'});};
  for(const id of ['po-html','po-css']) {
    $(id).addEventListener('input',()=>{undo=null;$('po-undo').hidden=true;changed();});
    $(id).addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();invite();}});
  }
  function press(tag){
    const value=$('po-label').value.trim();if(!value){$('po-tool-note').textContent='Write some words for your page first.';return;}
    const next=appendElement(state.html,tag,value);if(next.length>18000){$('po-tool-note').textContent='The page has reached the editor limit. Export it before expanding further.';return;}
    undo=state.html;$('po-html').value=next;changed();$('po-undo').hidden=false;
    pressSource.hidden=false;pressSource.textContent='You just made: '+appendElement('',tag,value).trim();
    $('po-tool-note').textContent='The press added a real '+tag+' element. Look at its opening tag, your words, and closing tag in the HTML editor.';
  }
  $('po-add-heading').onclick=()=>press('h1');$('po-add-paragraph').onclick=()=>press('p');
  $('po-undo').onclick=()=>{if(undo!==null){$('po-html').value=undo;changed();undo=null;$('po-undo').hidden=true;pressSource.hidden=true;}};
  $('po-frame').onclick=()=>{const next=frameFragment(state.html);if(next===null){$('po-tool-note').textContent='A document frame is already present. Edit its title and body in the source; your work was not replaced.';return;}if(next.length>18000){$('po-tool-note').textContent='This frame would exceed the page limit. Export your work before expanding it.';return;}$('po-html').value=next;changed();$('po-tool-note').textContent='Your content is now inside body. Add a name between the empty title tags in head.';};
  $('po-width').onclick=()=>{const narrow=$('po-frame-slot').classList.toggle('po-narrow');$('po-width').setAttribute('aria-pressed',String(narrow));$('po-width').textContent=narrow?'Wide view':'Narrow view';invalidate('Preview width changed. Invite again to inspect this width.');};
  $('po-demo-button').onclick=()=>{
    support();const c=chapter($('po-teaching').dataset.chapter);$('po-demo-code').textContent=c.demo+(c.css?'\n\n/* CSS editor */\n'+c.css:'');$('po-demo-why').textContent=c.why;$('po-demo-preview').hidden=true;$('po-demo').showModal();
  };
  $('po-demo-render').onclick=()=>{const c=chapter($('po-teaching').dataset.chapter);$('po-demo-preview').srcdoc=observatoryPreview(c.demo,c.css);$('po-demo-preview').hidden=false;};
  $('po-demo-close').onclick=()=>$('po-demo').close();
  $('po-help').onclick=()=>{
    support();$('po-teaching').hidden=false;teaching('paper');
    $('po-idea').textContent='This attempt is now supported practice. Choose a foundation to revisit; your practice draft stays untouched.';
    const nav=document.createElement('div');nav.className='po-help-nav';
    CHAPTERS.slice(0,4).forEach(c=>{const b=document.createElement('button');b.textContent=c.short;b.onclick=()=>teaching(c.id);nav.append(b);});
    $('po-teaching').prepend(nav);$('po-help').hidden=true;
  };
  $('po-export-page').onclick=()=>downloadText(observatoryPreview(draft().html,draft().css),state.mode==='check'?'my-practice-page.html':'my-observatory.html');
  $('po-desk').onclick=()=>{
    $('po-check-list').innerHTML=ASSESSMENTS.map(a=>`<button data-check="${a.id}">${esc(a.name)}<small>${state.seen.includes(a.id)?'Previously opened · repeat practice':'Not opened yet'}</small></button>`).join('');
    $('po-check-list').querySelectorAll('button').forEach(b=>b.onclick=()=>{
      if(state.check&&!confirm('Replace the current practice draft? Your observatory page is kept. Export the practice page first to keep it too.'))return;
      const a=ASSESSMENTS.find(a=>a.id===b.dataset.check);beginCheck(state,a.id,a.html);onChange();$('po-check-picker').close();showMode();
    });
    $('po-resume').hidden=!state.check;$('po-check-picker').showModal();
  };
  $('po-picker-close').onclick=()=>$('po-check-picker').close();
  $('po-resume').onclick=()=>{state.mode='check';onChange();$('po-check-picker').close();showMode();};
  $('po-return').onclick=()=>{support();state.mode='workshop';onChange();showMode();};
  showMode();
  return ()=>{clearTimeout(renderTimer);stopVisit();previewTicket++;root.replaceChildren();};
}
