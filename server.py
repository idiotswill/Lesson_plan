#!/usr/bin/env python3
"""Serve only the game files on localhost. No uploads, accounts or execution API."""
from __future__ import annotations
import argparse
import functools
import http.server
from pathlib import Path
import threading
import urllib.parse
import webbrowser

ROOT = Path(__file__).resolve().parent
ALLOWED_ROOT = {"index.html", "styles.css"}

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        target = (ROOT / path.lstrip('/')).resolve()
        if path == '/':
            target = ROOT / 'index.html'
        try:
            relative = target.relative_to(ROOT)
        except ValueError:
            self.send_error(403)
            return
        permitted = (str(relative) in ALLOWED_ROOT or
                     (relative.parts[0] == 'src' and target.suffix == '.js'))
        if not permitted or not target.is_file():
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        # Only GET is needed. Do not accidentally expose private directory metadata.
        self.send_error(405)

    def end_headers(self) -> None:
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def guess_type(self, path: str) -> str:
        return 'text/javascript' if path.endswith('.js') else super().guess_type(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    factory = functools.partial(Handler, directory=str(ROOT))
    try:
        with http.server.ThreadingHTTPServer(('127.0.0.1', args.port), factory) as server:
            url = f'http://127.0.0.1:{server.server_port}/'
            print(f'The Unfinished World: {url}\nLeave this window open. Ctrl+C stops the server.', flush=True)
            if not args.no_browser:
                threading.Timer(.5, lambda: webbrowser.open(url)).start()
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                print('\nSee you on the islands.')
    except OSError as exc:
        parser.exit(1, f'Could not start the local server: {exc}\nTry another port, for example: python server.py --port 8001\n')

if __name__ == '__main__':
    main()
