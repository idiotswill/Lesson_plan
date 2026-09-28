// Pinned, real CPython via Pyodide. No model/API calls. Not a hostile-code sandbox.
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs';
const runtime=loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});
const HARNESS=String.raw`
import json, sys, io, contextlib, ast, traceback
payload = json.loads(__payload_json)
results = []
class CappedOutput(io.TextIOBase):
    def __init__(self): self.text = ''
    def write(self, text):
        self.text += str(text)[:max(0,4000-len(self.text))]
        return len(text)
    def flush(self): pass
code = compile(payload['code'], '<your-program>', 'exec')
if payload.get('requiresLoop'):
    tree = ast.parse(payload['code'])
    if not any(isinstance(n, (ast.While, ast.For)) for n in ast.walk(tree)):
        raise ValueError('This task explicitly practises loops. Use a while or for loop, not only a formula.')
for inputs in payload['cases']:
    ns = dict(inputs)
    trace = []
    counter = [0]
    output = CappedOutput()
    def watch(frame, event, arg):
        if frame.f_code.co_filename == '<your-program>' and event in ('line','return'):
            counter[0] += 1
            if counter[0] > 20000: raise RuntimeError('Step limit reached. Check that your loop updates its counter and can stop.')
            if len(trace) < 160:
                vals = {k:v for k,v in frame.f_locals.items() if not k.startswith('_') and type(v) in (int,float,bool,str) and len(str(v))<100}
                trace.append({'line':frame.f_lineno, 'values':vals, 'event':event})
        return watch
    try:
        sys.settrace(watch)
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            exec(code, ns, ns)
        sys.settrace(None)
        value = ns.get(payload['output'], None)
        if type(value) not in (int,float,bool) or (type(value) is int and value.bit_length()>1000):
            value = None
        results.append({'value':value,'trace':trace,'stdout':output.text,'error':''})
    except BaseException as e:
        sys.settrace(None)
        results.append({'value':None,'trace':trace,'stdout':output.text,'error':type(e).__name__+': '+str(e)[:700]})
json.dumps(results, allow_nan=False)
`;
self.onmessage=async ({data})=>{
  try {
    const py=await runtime;
    self.postMessage({type:'running'});
    py.globals.set('__payload_json',JSON.stringify(data));
    const result=await py.runPythonAsync(HARNESS);
    self.postMessage({type:'result',results:JSON.parse(result)});
  } catch(e) { self.postMessage({type:'error',phase:'execution',message:String(e.message||e).slice(-2500)}); }
};
runtime.then(()=>self.postMessage({type:'ready'})).catch(e=>self.postMessage({type:'error',message:'Could not load Python. Check internet/CDN access, then retry. '+String(e.message||e)}));
