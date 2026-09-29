/** Same runner interface, now using a disposable LOCAL CPython child. No CDN. */
export class PythonRunner {
  constructor(){this.controller=null;this.generation=0;}
  stop(){this.generation++;this.controller?.abort();this.controller=null;}
  async run(payload,onStatus=()=>{}){
    this.stop();const generation=this.generation,controller=new AbortController();this.controller=controller;
    const timer=setTimeout(()=>controller.abort(),7000);
    try{
      onStatus('Running Python on this computer. Nothing is uploaded.');
      const session=await fetch('/api/session',{signal:controller.signal,cache:'no-store'});
      if(!session.ok)throw Error('Start the game with Start.cmd or Start.sh; the local Python launcher is required.');
      const {token}=await session.json();
      const response=await fetch('/api/python',{method:'POST',headers:{'Content-Type':'application/json','X-Game-Token':token},body:JSON.stringify(payload),signal:controller.signal});
      const data=await response.json();
      if(data.error||!response.ok){const error=Error(data.error||'Local Python could not run.');error.execution=true;throw error;}
      if(generation!==this.generation)throw Error('Run stopped. Your draft is safe.');
      return data.results;
    }catch(error){
      if(error.name==='AbortError')throw Error('Run stopped. The local child exits within four seconds. Your draft is safe.');
      throw error;
    }finally{clearTimeout(timer);if(generation===this.generation)this.controller=null;}
  }
}
