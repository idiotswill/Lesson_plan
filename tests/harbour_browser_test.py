"""Connected harbour UI tests.
Native mode exercises the launcher in Chromium. --offline-harness uses injected
module wrappers and substitute storage because some environments block localhost
browser navigation. The harness bridges fetch to the REAL loopback HTTP/Python
server; it is not native browser transport, localStorage or ES-module validation.
"""
import argparse
import functools
import http.server
import json
from pathlib import Path
import re
import sys
import threading
import urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import server as game
KEY='unfinished-world.v1'

def bundle(entry):
    """Tiny test-only wrapper for this project's static named-import modules."""
    result=[];seen=set()
    def visit(name):
        if name in seen:return
        seen.add(name);code=(ROOT/'src'/name).read_text()
        def dependency(match):
            bindings,dep=match.groups();dep=dep.removeprefix('./');visit(dep)
            return 'const {'+bindings+'} = __modules['+json.dumps(dep)+'];'
        code=re.sub(r'import\s*\{([^}]+)\}\s*from\s*[\'"]([^\'"]+)[\'"];',dependency,code)
        exports=re.findall(r'export\s+(?:async\s+)?(?:const|function|class|let)\s+(\w+)',code)
        code=re.sub(r'\bexport\s+','',code)
        result.append('__modules['+json.dumps(name)+']=(()=>{\n'+code+'\nreturn {'+','.join(exports)+'};})();')
    visit(entry);return '(()=>{const __modules={};\n'+'\n'.join(result)+'\n})();'

PAGE='''<h1>Our little harbour</h1><p>Welcome to our harbour.</p>
<a href="#sky">Chart directions</a><a href="#garden">Garden directions</a>
<section id="sky"><h2>Observation deck</h2><p>Take the north path.</p></section>
<section id="garden"><h2>Garden</h2><p>Take the west path.</p></section>'''

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--offline-harness',action='store_true');parser.add_argument('--browser',default='/usr/bin/chromium');parser.add_argument('--screenshots',type=Path)
    args=parser.parse_args()
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(game.Handler,directory=str(ROOT)))
    server.daemon_threads=True;threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    html=re.sub(r'<script.*?</script>|<link[^>]*>','',(ROOT/'index.html').read_text(),flags=re.S)
    script=bundle('harbour.js');groups=[];errors=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1500,'height':1050},accept_downloads=True)
        def open_page(raw=None,blocked=False,width=None):
            p=context.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
            if width:p.set_viewport_size({'width':width,'height':950})
            if args.offline_harness:
                p.set_content(html)
                for css in ['harbour.css','observatory.css']:p.add_style_tag(content=(ROOT/css).read_text())
                p.evaluate('''({raw,blocked,key})=>{window.saved=raw;Object.defineProperty(window,'localStorage',{value:{getItem:()=>{if(blocked)throw Error('blocked');return window.saved;},setItem:(k,v)=>{if(blocked)throw Error('blocked');window.saved=v;}}});}''',{'raw':raw,'blocked':blocked,'key':KEY})
                def local_fetch(path,options):
                    req=urllib.request.Request(base+path,data=options.get('body','').encode() if options.get('method')=='POST' else None,headers=options.get('headers') or {})
                    try:
                        with urllib.request.urlopen(req,timeout=10) as r:return {'status':r.status,'body':r.read().decode()}
                    except urllib.error.HTTPError as e:return {'status':e.code,'body':e.read().decode()}
                p.expose_function('localFetch',local_fetch)
                p.evaluate('''()=>{window.fetch=async(path,options={})=>{const r=await window.localFetch(path,{method:options.method,body:options.body,headers:options.headers});return new Response(r.body,{status:r.status,headers:{'Content-Type':'application/json'}});};}''')
                p.add_script_tag(content=script)
            else:
                if raw is not None:p.add_init_script(f'if(window===window.top&&!sessionStorage.seeded){{localStorage.setItem({json.dumps(KEY)},{json.dumps(raw)});sessionStorage.seeded=1;}}')
                p.goto(base,timeout=10000)
            expect(p.locator('#station-buttons button')).to_have_count(5)
            if p.locator('#welcome').is_visible():p.locator('#begin').click()
            p.wait_for_timeout(280)
            return p
        def save(p):p.wait_for_timeout(260);return json.loads(p.evaluate('(key)=>localStorage.getItem(key)',KEY))
        def station(p,id):p.locator(f'[data-station="{id}"]').click()
        def complete(p):
            p.locator('#dispatch').click();expect(p.locator('#step')).to_be_visible(timeout=12000)
            for _ in range(25):
                if not p.locator('#step').is_visible():break
                p.locator('#step').click()
            assert not p.locator('#step').is_visible()
            return p.locator('#journey-message').inner_text()
        def scan(p):station(p,'computing');p.locator('#scan').click()
        def screenshot(p,name):
            if args.screenshots:args.screenshots.mkdir(parents=True,exist_ok=True);p.screenshot(path=str(args.screenshots/name),full_page=True)

        p=open_page();screenshot(p,'harbour-first-view.png')
        for id in ['sets','python','digital','computing','web']:
            station(p,id);assert p.locator('#teach-text').inner_text();assert p.locator('#teach-position').inner_text().startswith('1 /');assert p.locator('#order option').count()==3
        groups.append('all five subject beginnings and all requests immediately accessible')
        p.locator('#label-words').fill('Our <little> harbour');p.locator('#add-h1').click()
        p.locator('#label-words').fill('Take the north path to the Observatory.');p.locator('#add-p').click()
        expect(p.frame_locator('#page-preview').locator('h1')).to_have_text('Our <little> harbour')
        assert '&lt;little&gt;' in p.locator('#harbour-html').input_value()
        p.locator('#inspect-page').click();expect(p.locator('#work-feedback')).to_contain_text('chooses north')
        groups.append('beginner label press writes escaped HTML; real document provides a route')

        before=p.locator('#harbour-html').input_value();p.locator('#full-workshop').click()
        expect(p.locator('#po-html')).to_have_value(before)
        p.locator('#po-html').fill(before+'\n<p>A note from the workshop.</p>')
        p.locator('#close-observatory').click();assert 'note from' in p.locator('#harbour-html').input_value()
        p.locator('#harbour-html').fill(before+'\n<p>Edited in the harbour.</p>')
        p.locator('#full-workshop').click();expect(p.locator('#po-html')).to_have_value(re.compile('Edited in the harbour.'))
        p.locator('#close-observatory').click()
        groups.append('embedded Observatory and harbour edit ONE draft in both directions, including reopening')

        station(p,'sets');p.locator('#sorter').select_option('b');assert save(p)['harbour']['selected']==['lens','chart']
        station(p,'computing');p.locator('#scan').click();expect(p.locator('#work-feedback')).to_contain_text('unplugged')
        p.locator('#scanner').select_option('processor');p.locator('#processor').select_option('display');p.locator('#scan').click()
        assert save(p)['harbour']['screen']==['lens','chart']
        station(p,'digital');p.locator('#gate').select_option('or');p.locator('#channel').click()
        assert 'output = 1' in p.locator('.signal-row').inner_text()
        station(p,'python');p.locator('#harbour-code').fill('energy = pods * 3 - leak');p.locator('#run-charger').click()
        expect(p.locator('#battery-label')).to_contain_text('output 8',timeout=10000)
        assert 'energy' in p.locator('#code-trace').text_content()
        message=complete(p);assert 'channel was blocked' in message
        groups.append('same cargo feeds real manifest, local CPython and live circuit; wrong OR hits the barrier')

        station(p,'digital');p.locator('#gate').select_option('and');p.locator('#channel').click()
        assert 'Nova charts' in complete(p)
        data=save(p);assert data['harbour']['deliveries']==['observation'];assert data['evidence']==[]
        screenshot(p,'harbour-first-discovery.png')
        groups.append('a complete integrated delivery changes the world without manufacturing mastery evidence')

        station(p,'sets');p.locator('#sorter').select_option('union');p.locator('#order').select_option('opening')
        assert 'older selection' in complete(p)
        station(p,'computing');p.locator('#memory').click();p.locator('#scan').click();p.locator('#power').click()
        assert save(p)['harbour']['screen']==[];p.locator('#recall').click();assert len(save(p)['harbour']['screen'])==3
        assert 'harbour gathers' in complete(p)
        groups.append('stale manifest blocks changed cargo; storage and recall restore real data; second request reuses systems')

        p.locator('#order').select_option('garden');station(p,'sets');p.locator('#sorter').select_option('difference');scan(p)
        assert 'page sent Pip north' in complete(p)
        station(p,'web');p.locator('#harbour-html').fill(PAGE);p.locator('#inspect-page').click();expect(p.locator('#work-feedback')).to_contain_text('chooses west')
        assert 'Mira lights' in complete(p);assert len(save(p)['harbour']['deliveries'])==3
        screenshot(p,'harbour-connected-world.png')
        groups.append('wrong rendered directions cause wrong-world destination; linked page serves both destinations')

        p.locator('#harbour-html').fill(PAGE.replace('href="#garden"','href="#missing"'))
        p.locator('#inspect-page').click();expect(p.locator('#work-feedback')).to_contain_text('No element')
        p.locator('#harbour-html').fill(PAGE);p.locator('#harbour-css').evaluate('(el)=>el.closest("details").open=true');p.locator('#harbour-css').fill('body{display:none}')
        p.locator('#inspect-page').click();expect(p.locator('#work-feedback')).to_contain_text('no visible h1')
        p.locator('#harbour-css').fill('');p.locator('#harbour-html').fill(PAGE+'<script>parent.hacked=1</script><img src="https://example.invalid/a">')
        p.wait_for_timeout(350);assert p.frame_locator('#page-preview').locator('script,img').count()==0;assert p.evaluate('window.hacked') is None
        p.locator('#harbour-html').fill(PAGE)
        groups.append('broken links and computed visibility affect routing; injected script and remote asset removed')

        station(p,'python');p.locator('#harbour-code').fill('energy = missing');assert 'NameError' in complete(p)
        p.locator('#harbour-code').fill('energy = 0');assert 'Not enough energy' in complete(p)
        p.locator('#harbour-code').fill('energy = pods * 3 - leak');p.locator('#run-charger').click();p.locator('#stop-code').click()
        expect(p.locator('#work-feedback')).to_contain_text('Stopped')
        groups.append('program errors, insufficient actual energy, and stop preserve the draft')

        p.locator('#dispatch').click();expect(p.locator('#step')).to_be_visible(timeout=10000)
        pending=save(p);assert pending['harbour']['stage']=='travelling'
        restored=open_page(json.dumps(pending));assert save(restored)['harbour']['journey']['cursor']==1
        station(restored,'sets');restored.locator('[data-crate="ribbon"]').click();expect(restored.locator('#step')).to_be_hidden();assert save(restored)['harbour']['journey'] is None
        assert len(save(restored)['harbour']['deliveries'])==3
        groups.append('saved unfinished journey rehydrates; edits cancel stale outcome without erasing discoveries')

        restored.locator('#save-button').click()
        with restored.expect_download() as info:restored.locator('#export-save').click()
        downloaded=info.value;path=downloaded.path();exported=json.loads(Path(path).read_text())
        assert exported['observatory']['html']==PAGE;assert exported['harbour']['deliveries']==pending['harbour']['deliveries']
        restored.locator('[data-close="settings"]').click()
        legacy={k:v for k,v in pending.items() if k!='harbour'}
        old=open_page(json.dumps(legacy));assert save(old)['observatory']['html']==PAGE;assert save(old)['harbour']['deliveries']==[]
        groups.append('save export contains shared page and world; older Observatory save migrates without deletion')

        mobile=open_page(json.dumps(pending),width=390);station(mobile,'computing')
        assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
        screenshot(mobile,'harbour-mobile.png')
        station(mobile,'python');mobile.locator('#harbour-code').focus();mobile.keyboard.press('Tab');assert mobile.evaluate('document.activeElement.id')!='harbour-code'
        groups.append('390px layout has no page overflow; editor permits keyboard exit')

        if args.offline_harness:
            newer=save(restored);newer['harbour']['code']='energy = 11';newer_text=json.dumps(newer)
            restored.evaluate('(value)=>{window.saved=value}',newer_text);station(restored,'sets');restored.locator('[data-crate="chart"]').click()
            expect(restored.locator('#save-warning')).to_contain_text('NOT written');assert restored.evaluate('window.saved')==newer_text
            corrupt=open_page('{broken');expect(corrupt.locator('#save-warning')).to_contain_text('NOT been overwritten');assert corrupt.evaluate('window.saved')=='{broken'
            blocked_page=open_page(None,blocked=True);expect(blocked_page.locator('#save-warning')).to_be_visible()
            groups.append('corrupt, unavailable and newer storage never silently overwrite persistent work (storage double)')
        assert not errors,errors
        print(json.dumps({'mode':'offline-harness' if args.offline_harness else 'native','groups':groups,'count':len(groups),'page_errors':errors},indent=2))
        browser.close()
    server.shutdown();server.server_close()
if __name__=='__main__':main()
