import {loadSave,persist} from './core.js';
import {mountObservatory,downloadText} from './observatory.js';
let storage;
try {storage=localStorage;} catch {storage={getItem(){throw Error('Storage blocked');},setItem(){throw Error('Storage blocked');}};}
const loaded=loadSave(storage),state=loaded.state;
const warning=document.getElementById('po-warning'),status=document.getElementById('po-save-status');
let timer;
function flush(){
  clearTimeout(timer);
  const message=loaded.blocked?loaded.warning:persist(state,storage);
  warning.textContent=message;warning.hidden=!message;
  status.textContent=message?'Not saved here · export a backup':'Saved in this browser';
}
function changed(){status.textContent='Saving…';clearTimeout(timer);timer=setTimeout(flush,180);}
warning.hidden=!loaded.warning;warning.textContent=loaded.warning;
mountObservatory(document.getElementById('po-root'),state.observatory,changed,{calm:state.calm});
document.getElementById('po-save-export').onclick=()=>downloadText(JSON.stringify(state,null,2),'unfinished-world-save.json','application/json');
window.addEventListener('pagehide',flush);
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
window.addEventListener('storage',()=>{warning.hidden=false;warning.textContent='Another page changed this expedition. Export any unsaved work here, then reload. This page will not overwrite the newer save.';});
flush();
