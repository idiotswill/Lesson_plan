import {previewDocument} from './web-workshop.js';
/** Deliberately inspect the browser result, not an expected source-code string. */
export function isVisible(el) {
  if (!el || !el.isConnected || !el.getClientRects().length || !(el.innerText ?? el.textContent).trim()) return false;
  const rect=el.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return false;
  for(let node=el;node?.nodeType===1;node=node.parentElement) {
    const s=node.ownerDocument.defaultView.getComputedStyle(node);
    if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity)===0) return false;
  }
  return true;
}
export function observatoryPreview(html,css) {
  return previewDocument(html,'body{font:16px/1.6 system-ui;background:#fff9ed;color:#292639;padding:24px}a{color:#354399}'+css)
    .replace(/<head(?:\s[^>]*)?>/i,tag=>tag+'<meta charset="UTF-8">');
}
export function hasDocumentFrame(html) {
  const clean=html.replace(/<!--[\s\S]*?-->/g,'');
  return /<!doctype\s+html\s*>/i.test(clean) && /<html(?:\s[^>]*)?>[\s\S]*<head(?:\s[^>]*)?>[\s\S]*<title(?:\s[^>]*)?>[\s\S]*<\/title\s*>[\s\S]*<\/head\s*>[\s\S]*<body(?:\s[^>]*)?>[\s\S]*<\/body\s*>[\s\S]*<\/html\s*>/i.test(clean);
}
export function frameFragment(html) {
  if(/<(?:html|head|body)(?:\s|>)/i.test(html)) return null;
  return '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title></title>\n</head>\n<body>\n'+html+'\n</body>\n</html>';
}
export function appendElement(html,tag,content) {
  if(!['h1','p'].includes(tag)) throw Error('Unsupported label type.');
  const safe=content.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const element='<'+tag+'>'+safe+'</'+tag+'>\n';
  return /<\/body\s*>/i.test(html)?html.replace(/<\/body\s*>/i,element+'</body>'):html+(html?'\n':'')+element;
}
export function destinationFor(doc,href) {
  if(!href?.startsWith('#')||href.length<2) return {error:'The link does not name a destination on this page.'};
  let id;try{id=decodeURIComponent(href.slice(1));}catch{return {error:'The destination contains an invalid encoded character.'};}
  const matches=[...doc.querySelectorAll('[id]')].filter(el=>el.id===id);
  if(matches.length!==1) return {id,error:matches.length?'Two or more elements share id="'+id+'". Give each destination a unique ID.':'No element has id="'+id+'". The href and id must match.'};
  if(!isVisible(matches[0])) return {id,error:'The destination #'+id+' is hidden or empty.'};
  return {id,element:matches[0]};
}
function sectionText(el) {
  let value=el.innerText || '';
  // An ID on a heading can label the following content; do not require a section wrapper.
  if(/^H[1-6]$/.test(el.tagName)) {
    const level=Number(el.tagName[1]);
    for(let next=el.nextElementSibling;next;next=next.nextElementSibling) {
      if(/^H[1-6]$/.test(next.tagName) && Number(next.tagName[1])<=level) break;
      if(isVisible(next)) value+=' '+next.innerText;
    }
  }
  return value;
}
const event=(text,ok=true,target=null)=>({text,ok,target});
function routeVisitor(doc,name,label,word) {
  const steps=[event(name+' needs '+label+' information. Searching the visible link labels…')];
  const link=[...doc.querySelectorAll('a')].find(a=>isVisible(a)&&a.innerText.toLowerCase().includes(label.toLowerCase()));
  if(!link) {steps.push(event('No visible link label contains “'+label+'”. Plain text is not a link.',false));return {name,steps,ok:false};}
  steps.push(event('Chose “'+link.innerText.trim()+'” → '+(link.getAttribute('href')||'(no href)'),true,link));
  const target=destinationFor(doc,link.getAttribute('href'));
  if(target.error){steps.push(event(target.error,false));return {name,steps,ok:false};}
  steps.push(event('Arrived at #'+target.id+'. Reading this destination…',true,target.element));
  const ok=sectionText(target.element).toLowerCase().includes(word.toLowerCase());
  steps.push(event(ok?'Found “'+word+'” at this destination. The route works.':'Landed here, but cannot find “'+word+'” in this destination’s visible content.',ok,target.element));
  return {name,steps,ok,target:target.id};
}
function pageVisitor(doc,html,full) {
  const steps=[event('Pip opens your page.')];
  let ok=true;
  if(full) {
    const frame=hasDocumentFrame(html), title=!!doc.title.trim();ok=frame&&title;
    steps.push(event(frame?'The source contains a document frame.':'The source needs doctype, html, head with title, and body, in that order.',frame));
    steps.push(event(title?'Tab: “'+doc.title.trim()+'”.':'The browser tab has no title. Add text inside title in head.',title));
  }
  const hs=[...doc.body.querySelectorAll('h1')].filter(isVisible);
  const ps=[...doc.body.querySelectorAll('p')].filter(isVisible);
  steps.push(event(hs.length===1?'Pip sees the main heading “'+hs[0].innerText.trim()+'”.':'Pip needs one visible, non-empty h1 to identify this page.',hs.length===1,hs[0]));
  steps.push(event(ps.length?'Pip reads: “'+ps[0].innerText.trim()+'”.':'There is no visible, non-empty paragraph describing this place.',ps.length>0,ps[0]));
  return {name:'Pip',steps,ok:ok&&hs.length===1&&ps.length>0};
}
function noticeVisitor(doc,count) {
  const els=[...doc.getElementsByClassName('notice')];
  const steps=[event('Mira inspects the actual .notice elements.')];
  let ok=els.length>=count;
  steps.push(event('Found '+els.length+' notice element(s); this visit needs at least '+count+'.',ok));
  for(const el of els) {
    const s=doc.defaultView.getComputedStyle(el);
    const padding=['paddingTop','paddingRight','paddingBottom','paddingLeft'].map(k=>parseFloat(s[k]));
    const size=parseFloat(s.fontSize),pass=isVisible(el)&&size>=18&&padding.every(p=>p>=12);
    ok=ok&&pass;
    steps.push(event('“'+el.innerText.trim().slice(0,80)+'”: '+size+'px text; '+padding.join(' / ')+'px padding (top / right / bottom / left).'+(pass?' Comfortable for Mira.':' Needs visible text, at least 18px font-size and 12px padding on every side.'),pass,el));
  }
  return {name:'Mira',steps,ok};
}
export function planVisit(doc,{stage='paper',html='',assessment=null}={}) {
  if(!doc?.defaultView) throw Error('The preview has not loaded. Try inviting again.');
  const visitors=[pageVisitor(doc,html,stage!=='paper'||!!assessment)];
  if(assessment || ['paths','notices','opening'].includes(stage)) {
    const routes=assessment?.routes||[['Nova','chart','north'],['Orin','hours','dusk']];
    const journeys=routes.map(([name,label,word])=>routeVisitor(doc,name,label,word));
    const targets=journeys.filter(v=>v.target).map(v=>v.target);
    if(targets.length!==new Set(targets).size) {
      journeys.forEach(v=>{v.ok=false;v.steps.push(event('These visitors need two different destinations, not the same shared target.',false));});
    }
    visitors.push(...journeys);
  }
  if(assessment||['notices','opening'].includes(stage))visitors.push(noticeVisitor(doc,stage==='opening'||assessment?.id==='garden'?3:2));
  return visitors;
}
