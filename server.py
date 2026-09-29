#!/usr/bin/env python3
"""Local single-player launcher. No account, cloud service or internet runtime."""
from __future__ import annotations
import argparse
import functools
import http.server
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import threading
import urllib.parse
import webbrowser

ROOT=Path(__file__).resolve().parent
ALLOWED_ROOT={'index.html','expedition.html','styles.css','teaching.css','harbour.css','paper-observatory.html','observatory.css'}
TOKEN=secrets.token_urlsafe(32)
RUNS=threading.BoundedSemaphore(2)

class Handler(http.server.SimpleHTTPRequestHandler):
    def local_request(self):
        port=self.server.server_port
        hosts={f'127.0.0.1:{port}',f'localhost:{port}'}
        if self.headers.get('Host') not in hosts: return False
        origin=self.headers.get('Origin')
        if origin and origin not in {f'http://{host}' for host in hosts}: return False
        if self.headers.get('Sec-Fetch-Site') not in (None,'same-origin','none'): return False
        return True

    def reply(self,status,data):
        body=json.dumps(data).encode('utf-8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body)));self.end_headers()
        try: self.wfile.write(body)
        except (BrokenPipeError,ConnectionResetError): pass

    def do_GET(self):
        if not self.local_request(): self.send_error(403);return
        path=urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        if path=='/api/session': self.reply(200,{'token':TOKEN,'runtime':'local-cpython','version':sys.version.split()[0]});return
        target=(ROOT/path.lstrip('/')).resolve() if path!='/' else ROOT/'index.html'
        try: relative=target.relative_to(ROOT)
        except ValueError: self.send_error(403);return
        permitted=(str(relative) in ALLOWED_ROOT or (len(relative.parts)>1 and relative.parts[0]=='src' and target.suffix=='.js'))
        if not permitted or not target.is_file(): self.send_error(404);return
        super().do_GET()

    def do_POST(self):
        if not self.local_request() or not secrets.compare_digest(self.headers.get('X-Game-Token',''),TOKEN):
            self.reply(403,{'error':'Only this local game session may run code.'});return
        if self.path!='/api/python': self.send_error(404);return
        try: length=int(self.headers.get('Content-Length','0'))
        except ValueError: length=0
        if not 0<length<=60000 or self.headers.get('Content-Type','').split(';')[0]!='application/json':
            self.reply(400,{'error':'Invalid or oversized program request.'});return
        if not RUNS.acquire(blocking=False): self.reply(429,{'error':'Two programs are still running. Wait a moment and try again.'});return
        try:
            self.connection.settimeout(5)
            body=self.rfile.read(length)
            json.loads(body)  # Reject malformed JSON before starting a child.
            # The child has no shell, no game directory as cwd, and no inherited
            # app credentials. -I -S disables user-site imports and environment config.
            env={k:v for k,v in os.environ.items() if k in ('SYSTEMROOT','WINDIR','TEMP','TMP')}
            with tempfile.TemporaryDirectory(prefix='unfinished-world-') as directory:
                proc=subprocess.run([sys.executable,'-I','-S',str(ROOT/'local_python.py')],input=body,
                    capture_output=True,cwd=directory,env=env,timeout=4)
            if proc.returncode!=0: self.reply(400,{'error':'Python stopped at a resource limit. Your draft is unchanged.'});return
            result=json.loads(proc.stdout)
            self.reply(200,result)
        except subprocess.TimeoutExpired: self.reply(200,{'error':'Execution stopped after four seconds. Check for an infinite loop.'})
        except (ValueError,OSError,TimeoutError): self.reply(400,{'error':'The local Python request could not be completed.'})
        finally: RUNS.release()

    def do_HEAD(self): self.send_error(405)
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Cache-Control','no-store')
        # No internet, embeds, forms or injected scripts in the parent game.
        # Child srcdoc previews have their own stricter content policy.
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self' about:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
        super().end_headers()
    def guess_type(self,path): return 'text/javascript' if path.endswith('.js') else super().guess_type(path)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=8000);parser.add_argument('--no-browser',action='store_true')
    args=parser.parse_args()
    if sys.version_info<(3,9): parser.exit(1,'Python 3.9 or newer is required.\n')
    try:
        with http.server.ThreadingHTTPServer(('127.0.0.1',args.port),functools.partial(Handler,directory=str(ROOT))) as server:
            server.daemon_threads=True
            url=f'http://127.0.0.1:{server.server_port}/'
            print(f'The Unfinished World: {url}\nLocal single player. Leave this window open; Ctrl+C exits.',flush=True)
            if not args.no_browser: threading.Timer(.5,lambda:webbrowser.open(url)).start()
            try: server.serve_forever()
            except KeyboardInterrupt: print('\nSee you in the harbour.')
    except OSError as exc: parser.exit(1,f'Could not start: {exc}\nClose the older launcher first. Use the same port to keep browser saves.\n')
if __name__=='__main__': main()
