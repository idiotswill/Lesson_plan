import {isVisible,destinationFor} from './observatory-engine.js';
/** Fictional, transparent sign-reader rules. Never claims to understand prose. */
export function readHarbourPage(doc,order){
  if(!doc?.defaultView)return {error:'The information terminal has not rendered yet. Open it and try again.'};
  const heading=[...doc.querySelectorAll('h1')].find(isVisible);
  if(!heading)return {error:'The terminal has no visible h1 heading. Make a name sign in the HTML workbench.'};
  const link=[...doc.querySelectorAll('a')].find(a=>isVisible(a)&&(a.innerText||'').toLowerCase().includes(order.label));
  let text,description;
  if(link){
    const target=destinationFor(doc,link.getAttribute('href'));
    if(target.error)return {error:target.error};
    text=target.element.innerText;
    if(/^H[1-6]$/.test(target.element.tagName)){
      for(let next=target.element.nextElementSibling;next&&!/^H[1-6]$/.test(next.tagName);next=next.nextElementSibling)if(isVisible(next))text+=' '+next.innerText;
    }
    description='Nova follows “'+link.innerText.trim()+'” to #'+target.id;
  }else{
    const paragraph=[...doc.querySelectorAll('p')].find(isVisible);
    if(!paragraph)return {error:'The terminal needs a visible paragraph. Start with one direction notice.'};
    text=paragraph.innerText;description='Nova reads the first visible paragraph';
  }
  const words=(text||'').toLowerCase(),north=/\bnorth\b/.test(words),west=/\bwest\b/.test(words);
  if(north===west)return {error:description+', but needs exactly one direction word: north OR west. With multiple destinations, use labelled links and separate sections.'};
  const direction=north?'north':'west';
  return {direction,title:heading.innerText.trim(),message:description+' and chooses '+direction+'.'};
}
