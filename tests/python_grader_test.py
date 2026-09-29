"""Independent CPython checks for worked teaching traces and real grading harness.
Does NOT test Pyodide/CDN/browser worker. No network or third-party dependencies.
"""
from pathlib import Path
import json
import subprocess
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
GUIDES=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {GUIDES} from './src/teaching-content.js'; console.log(JSON.stringify(GUIDES));"],cwd=ROOT))
HARNESS=(ROOT/'src/python-worker.js').read_text().split('const HARNESS=String.raw`',1)[1].split('`;',1)[0]
EXECUTABLE=HARNESS.rsplit('json.dumps(results, allow_nan=False)',1)[0]
def grade(code,output,inputs,loop=False):
    ns={'__payload_json':json.dumps({'code':code,'output':output,'cases':inputs,'requiresLoop':loop})}
    exec(EXECUTABLE,ns,ns)
    return ns['results']
class WorkedExamples(unittest.TestCase):
    def test_all_demonstrated_python_frames_match_actual_execution(self):
        demos=0
        for lesson_id,guide in GUIDES.items():
            if not lesson_id.startswith('py-'):continue
            for step in guide['steps']:
                if not step.get('frames'):continue
                demos+=1;ns=dict(step.get('initial',{}));events=[]
                def watch(frame,event,arg):
                    if frame.f_code.co_filename=='<teaching-demo>' and event in ('line','return'):
                        events.append((frame.f_lineno,{k:v for k,v in frame.f_locals.items() if not k.startswith('_')}))
                    return watch
                try:
                    sys.settrace(watch);exec(compile(step['code'],'<teaching-demo>','exec'),ns,ns)
                finally:sys.settrace(None)
                after=[{'line':events[i][0],'values':events[i+1][1]} for i in range(len(events)-1)]
                expected=[{'line':f['line'],'values':f['values']} for f in step['frames']]
                self.assertEqual(after,expected,lesson_id+' / '+step['title'])
        self.assertEqual(demos,4)
    def test_energy_with_many_inputs_and_wrong_rule(self):
        inputs=[{'pods':p,'leak':l,'rate':3} for p in range(10) for l in range(4)]
        results=grade('energy = pods * 3 - leak','energy',inputs)
        for i,r in zip(inputs,results):self.assertEqual(r['value'],i['pods']*3-i['leak']);self.assertFalse(r['error'])
        wrong=grade('energy = pods + 3 - leak','energy',inputs)
        self.assertTrue(any(r['value']!=i['pods']*3-i['leak'] for i,r in zip(inputs,wrong)))
    def test_decisions_for_every_boolean_and_boundary(self):
        inputs=[{'wind':w,'limit':4,'charged':c} for c in [True,False] for w in [0,3,4,5]]
        code=GUIDES['py-decision']['steps'][-1]['code']
        for i,r in zip(inputs,grade(code,'fly',inputs)):
            self.assertIs(type(r['value']),bool);self.assertEqual(r['value'],i['charged'] and i['wind']<4)
        wrong=grade('fly = charged and wind <= limit','fly',inputs)
        self.assertTrue(any(r['value']!=(i['charged'] and i['wind']<4) for i,r in zip(inputs,wrong)))
    def test_taught_loop_matches_independent_sum_and_stops(self):
        code=GUIDES['py-loop']['steps'][-1]['code'];inputs=[{'stops':n} for n in range(21)]
        for i,r in zip(inputs,grade(code,'charge',inputs,True)):
            self.assertEqual(r['value'],sum(range(1,i['stops']+1)));self.assertFalse(r['error'])
        no_update=grade('charge = 0\nstep = 1\nwhile step <= stops:\n    charge += step','charge',[{'stops':3}],True)
        self.assertIn('Step limit',no_update[0]['error'])
    def test_bad_syntax_and_missing_loop_are_not_success(self):
        with self.assertRaises(SyntaxError):grade('energy =','energy',[{'pods':3}])
        with self.assertRaises(ValueError):grade('charge = 6','charge',[{'stops':3}],True)
if __name__=='__main__':unittest.main(verbosity=2)
