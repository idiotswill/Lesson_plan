/** Every submission gets a fresh worker: no globals leak between attempts. */
export class PythonRunner {
  constructor(){this.worker=null;this.reject=null;this.timer=null;}
  stop(){
    clearTimeout(this.timer); this.worker?.terminate(); this.worker=null;
    if(this.reject){const reject=this.reject;this.reject=null;reject(new Error('Run stopped. Your code and progress are safe.'));}
  }
  run(payload,onStatus=()=>{}){
    this.stop();
    return new Promise((resolve,reject)=>{
      this.reject=reject;
      const finish=(error,data)=>{
        clearTimeout(this.timer); this.worker?.terminate(); this.worker=null;this.reject=null;
        error?reject(error):resolve(data);
      };
      try { this.worker=new Worker(new URL('./python-worker.js',import.meta.url),{type:'module'}); }
      catch(e){finish(new Error('Python workers are unavailable. Run the game through the local server or HTTPS. '+e.message));return;}
      onStatus('Loading Python locally in your browser. The first download may take a moment…');
      this.timer=setTimeout(()=>finish(new Error('Python did not load within 60 seconds. Check your internet connection or CDN permissions and retry.')),60000);
      this.worker.onerror=()=>finish(new Error('Python could not start. Check internet access to cdn.jsdelivr.net, then try again.'));
      this.worker.onmessage=({data})=>{
        if(data.type==='ready'){
          onStatus('Python ready. Running your program against the test inputs…');
          this.worker.postMessage(payload);
        }
        if(data.type==='running'){
          clearTimeout(this.timer);
          this.timer=setTimeout(()=>finish(new Error('Execution stopped after 5 seconds. Check for an infinite loop.')),5000);
        }
        if(data.type==='result')finish(null,data.results);
        if(data.type==='error'){const error=new Error(data.message);error.execution=data.phase==='execution';finish(error);}
      };
    });
  }
}
