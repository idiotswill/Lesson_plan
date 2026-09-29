"""Real loopback HTTP and disposable CPython process tests; no browser mock."""
import functools
import http.server
import json
from pathlib import Path
import sys
import socket
import subprocess
import time
import threading
import unittest
import urllib.error
import urllib.request
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import server as game

class LocalServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(game.Handler,directory=str(ROOT)))
        cls.http.daemon_threads=True
        threading.Thread(target=cls.http.serve_forever,daemon=True).start()
        cls.base=f'http://127.0.0.1:{cls.http.server_port}'
        cls.token=json.load(urllib.request.urlopen(cls.base+'/api/session'))['token']
    @classmethod
    def tearDownClass(cls):cls.http.shutdown();cls.http.server_close()
    def request(self,path,body=None,headers=None):
        req=urllib.request.Request(self.base+path,data=body,headers=headers or {})
        try:
            with urllib.request.urlopen(req,timeout=10) as response:return response.status,response.headers,response.read()
        except urllib.error.HTTPError as error:return error.code,error.headers,error.read()
    def run_code(self,code,inputs=None,output='energy'):
        status,_,body=self.request('/api/python',json.dumps({'code':code,'output':output,'cases':[inputs or {'pods':3,'leak':1}]}).encode(),{'Content-Type':'application/json','X-Game-Token':self.token})
        self.assertEqual(status,200,body);return json.loads(body)
    def test_all_actual_entry_files_and_transitive_javascript_are_served(self):
        for name in ['','index.html','expedition.html','paper-observatory.html','harbour.css','observatory.css','styles.css','teaching.css']+[str(p.relative_to(ROOT)) for p in (ROOT/'src').glob('*.js')]:
            status,headers,body=self.request('/'+name);self.assertEqual(status,200,name);self.assertTrue(body)
            self.assertIn("connect-src 'self'",headers['Content-Security-Policy'])
    def test_python_source_private_docs_and_directory_traversal_are_not_served(self):
        for path in ['/server.py','/local_python.py','/docs/QA.md','/.git/config','/../private-notes.md','/src/../server.py','/src/','/%2e%2e/server.py']:
            self.assertIn(self.request(path)[0],(403,404),path)
    def test_foreign_host_and_origin_are_blocked(self):
        self.assertEqual(self.request('/api/session',headers={'Host':'attacker.invalid'})[0],403)
        self.assertEqual(self.request('/api/session',headers={'Origin':'https://attacker.invalid'})[0],403)
        self.assertEqual(self.request('/api/session',headers={'Sec-Fetch-Site':'cross-site'})[0],403)
    def test_write_requires_token_and_json_and_correct_origin(self):
        self.assertEqual(self.request('/api/python',b'{}',{'Content-Type':'application/json'})[0],403)
        self.assertEqual(self.request('/api/python',b'{}',{'Content-Type':'text/plain','X-Game-Token':self.token})[0],400)
        self.assertEqual(self.request('/api/python',b'{}',{'Content-Type':'application/json','X-Game-Token':self.token,'Origin':'http://attacker.invalid'})[0],403)
    def test_real_charger_and_utf8_comments(self):
        result=self.run_code('# Čaša, svjetlo, život\nenergy = pods * 3 - leak')['results'][0]
        self.assertEqual(result['value'],8);self.assertFalse(result['error']);self.assertTrue(result['trace'])
    def test_two_valid_programs_and_changed_inputs(self):
        for code in ['energy = pods * 3 - leak','energy = pods * 3\nenergy -= leak']:
            for pods in [0,1,3,8]:self.assertEqual(self.run_code(code,{'pods':pods,'leak':1})['results'][0]['value'],pods*3-1)
    def test_loops_decisions_and_simple_collections(self):
        result=self.run_code('energy = 0\nfor n in range(1, stops+1):\n    energy += n',{'stops':4})
        self.assertEqual(result['results'][0]['value'],10)
        self.assertEqual(self.run_code('energy = sum([1,2,3])')['results'][0]['value'],6)
        self.assertIs(self.run_code('energy = pods > 1 and leak < 2')['results'][0]['value'],True)
    def test_syntax_and_name_errors_are_not_numeric_results(self):
        self.assertIn('SyntaxError',self.run_code('energy =')['error'])
        result=self.run_code('energy = missing')['results'][0];self.assertIsNone(result['value']);self.assertIn('NameError',result['error'])
    def test_infinite_program_is_bounded_and_next_program_still_runs(self):
        result=self.run_code('while True:\n    pass')['results'][0];self.assertIn('Step limit',result['error'])
        self.assertEqual(self.run_code('energy = 5')['results'][0]['value'],5)
    def test_imports_attributes_eval_and_files_are_rejected(self):
        for code in ['import os','energy = (1).__class__','energy = open("file")','exec("energy=5")','energy = __builtins__','energy = (lambda: 5)()']:
            self.assertIn('error',self.run_code(code),code)
    def test_large_numeric_and_sequence_allocations_are_bounded(self):
        for code in ['energy = 10 ** 999999','x = [0] * 1000000000\nenergy = 1','energy = sum(range(1000000000))','energy = 1000000000000 * 1000000000000']:
            result=self.run_code(code);self.assertTrue(result.get('error') or result['results'][0]['error'],code)
    def test_launcher_restarts_on_same_origin_with_new_session_and_working_python(self):
        with socket.socket() as probe:
            probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
        base=f'http://127.0.0.1:{port}'
        previous=None
        for cycle in range(2):
            proc=subprocess.Popen([sys.executable,str(ROOT/'server.py'),'--no-browser','--port',str(port)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            try:
                for _ in range(60):
                    try:
                        with urllib.request.urlopen(base+'/api/session',timeout=1) as r:token=json.load(r)['token']
                        break
                    except OSError:time.sleep(.05)
                else:self.fail('Launcher did not start')
                with urllib.request.urlopen(base+'/') as r:self.assertIn(b'src/harbour.js',r.read())
                body=json.dumps({'code':'energy = pods * 3 - leak','output':'energy','cases':[{'pods':3,'leak':1}]}).encode()
                req=urllib.request.Request(base+'/api/python',data=body,headers={'Content-Type':'application/json','X-Game-Token':token})
                with urllib.request.urlopen(req) as r:self.assertEqual(json.load(r)['results'][0]['value'],8)
                if previous is not None:self.assertNotEqual(previous,token)
                previous=token
            finally:
                proc.terminate();proc.wait(timeout=5)

    def test_stdout_is_capped_and_locals_do_not_leak_between_runs(self):
        result=self.run_code('for i in range(1000):\n    print("a long line of output")\nenergy=2')['results'][0]
        self.assertLessEqual(len(result['stdout']),4000)
        self.run_code('private_value=7\nenergy=private_value')
        self.assertIn('NameError',self.run_code('energy=private_value')['results'][0]['error'])
if __name__=='__main__':unittest.main(verbosity=2)
