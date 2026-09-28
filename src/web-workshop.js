/** A deliberately bounded HTML/CSS workbench. Scripts, remote assets and forms do not run. */
export function webStarter(lesson,spec){
  if(lesson.id==='web-css')return `<!doctype html>\n<html lang="en">\n<head><title>Beacons</title></head>\n<body>\n  <p class="${spec.className}">A light for the lost.</p>\n  <p class="${spec.className}">A light for the curious.</p>\n</body>\n</html>`;
  if(lesson.id==='web-links')return `<!doctype html>\n<html lang="en">\n<head><title>Star paths</title></head>\n<body>\n  <h1>Find your way</h1>\n  <!-- Add a link, and a matching destination below. -->\n  <p>The stars took a wrong turn somewhere.</p>\n</body>\n</html>`;
  return '<!doctype html>\n<html lang="en">\n<head>\n  <title></title>\n</head>\n<body>\n  <!-- Give this place a heading and a paragraph. -->\n</body>\n</html>';
}
export function previewDocument(html,css){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const allowed=new Set(['HTML','HEAD','BODY','TITLE','H1','H2','H3','H4','P','A','DIV','SPAN','SECTION','ARTICLE','MAIN','HEADER','FOOTER','NAV','UL','OL','LI','STRONG','EM','BR','HR','PRE','CODE','BLOCKQUOTE']);
  for(const el of [...doc.querySelectorAll('*')]){
    if(!allowed.has(el.tagName)){el.remove();continue;}
    for(const a of [...el.attributes]){
      const safe=['id','class','lang','title'].includes(a.name)||(a.name==='href'&&a.value.startsWith('#'));
      if(!safe)el.removeAttribute(a.name);
    }
  }
  const policy=doc.createElement('meta');
  policy.httpEquiv='Content-Security-Policy';
  policy.content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none';";
  doc.head.prepend(policy);
  const style=doc.createElement('style');
  style.textContent='body{font:16px/1.6 system-ui;background:#101e31;color:#e6edf7;padding:22px;overflow-wrap:anywhere}a{color:#a5e3cd}'+css.replace(/<\/style/gi,'<\\/style');
  doc.head.append(style);
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
function visible(el,win){
  if(!el||!el.textContent.trim())return false;
  const s=win.getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&el.getClientRects().length>0;
}
export function checkWeb(lesson,spec,doc){
  const win=doc.defaultView, checks=[];
  const add=(ok,message)=>checks.push({ok:!!ok,message});
  if(lesson.id==='web-structure'){
    add(doc.title.trim()===spec.title,'The browser title is exactly “'+spec.title+'”.');
    const headings=[...doc.querySelectorAll('h1')];
    add(headings.length===1&&visible(headings[0],win),'There is one visible, non-empty h1.');
    add([...doc.querySelectorAll('p')].some(p=>visible(p,win)),'There is a visible, non-empty paragraph.');
  }else if(lesson.id==='web-links'){
    const targets=[...doc.querySelectorAll('[id]')].filter(el=>el.id===spec.target);
    add(targets.length===1&&visible(targets[0],win),'One visible destination has id="'+spec.target+'".');
    add([...doc.querySelectorAll('a')].some(a=>a.getAttribute('href')==='#'+spec.target&&visible(a,win)),'A visible text link points to #'+spec.target+'.');
  }else{
    const els=[...doc.getElementsByClassName(spec.className)];
    add(els.length>=2,'At least two elements share class="'+spec.className+'".');
    const rgb=spec.colour==='#ffd166'?'rgb(255, 209, 102)':'rgb(137, 220, 235)';
    add(els.length>=2&&els.every(el=>visible(el,win)&&win.getComputedStyle(el).color===rgb),'Both elements have the requested text colour '+spec.colour+'.');
    add(els.length>=2&&els.every(el=>['paddingTop','paddingRight','paddingBottom','paddingLeft'].every(k=>parseFloat(win.getComputedStyle(el)[k])>=spec.padding)),'Both elements have at least '+spec.padding+'px padding on every side.');
  }
  return checks;
}
