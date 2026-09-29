"""Paper Observatory UI acceptance tests.
Default: native HTTP, native modules and native localStorage.
--offline-harness: inline a dependency-ordered bundle and use substitute storage;
this exercises real Chromium DOM/rendering, NOT native module/network/persistence paths.
Requires Python Playwright and Chromium (or --browser /path/to/chromium).
"""
import argparse
import functools
import http.server
import json
from pathlib import Path
import re
import threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
KEY = 'unfinished-world.v1'
MODULES = ['harbour-state.js','observatory-state.js','content.js','core.js','web-workshop.js',
           'observatory-content.js','observatory-engine.js','observatory.js','observatory-page.js']
PAGE = '''<!doctype html><html lang="en"><head><title>My working sky</title></head><body>
<h1>A sky for everyone</h1><p>Welcome to my observatory.</p>
<a href="#north-map">Chart of the sky</a><a href="#when">Opening hours</a>
<h2 id="north-map">Chart</h2><p>Look north for the stars.</p>
<h2 id="when">Hours</h2><p>We open at dusk.</p>
<p class="notice">Bring a warm coat.</p><p class="notice">Keep the path clear.</p>
</body></html>'''
CSS = '.notice {font-size:20px;padding:14px;color:navy;background-color:ivory;}'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--offline-harness', action='store_true')
    parser.add_argument('--browser', default=None)
    parser.add_argument('--screenshots', type=Path, default=None)
    args = parser.parse_args()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    server = None
    if not args.offline_harness:
        server = http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        url = f'http://127.0.0.1:{server.server_port}/paper-observatory.html'
    html = re.sub(r'<script.*?</script>|<link[^>]*>', '', (ROOT/'paper-observatory.html').read_text(), flags=re.S)
    bundle = '\n'.join(re.sub(r'^import .*?;\n','',(ROOT/'src'/name).read_text(),flags=re.M).replace('export ','') for name in MODULES)
    groups = []
    with sync_playwright() as p:
        launch = {'headless':True}
        if args.browser: launch['executable_path']=args.browser
        browser = p.chromium.launch(**launch)
        context = browser.new_context(viewport={'width':1440,'height':1000})
        errors = []
        def open_page(raw=None, blocked=False):
            page=context.new_page(); page.on('pageerror', lambda e:errors.append(str(e)))
            if args.offline_harness:
                page.set_content(html)
                page.add_style_tag(content=(ROOT/'observatory.css').read_text())
                page.evaluate('''({raw,blocked,key})=>{let saved=raw;
                  Object.defineProperty(window,'localStorage',{value:{
                    getItem:()=>{if(blocked)throw Error('Storage blocked for test');return saved;},
                    setItem:(_key,value)=>{if(blocked)throw Error('Storage blocked for test');saved=String(value);}
                  }});
                }''',{'raw':raw,'blocked':blocked,'key':KEY})
                page.add_script_tag(content='(()=>{'+bundle+'})()')
            else:
                if blocked:
                    page.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('Storage blocked for test')}})")
                elif raw is not None:
                    page.add_init_script(f"if(window===window.top&&!sessionStorage.getItem('po-test-seeded')){{localStorage.setItem({json.dumps(KEY)},{json.dumps(raw)});sessionStorage.setItem('po-test-seeded','1');}}")
                page.goto(url)
            expect(page.locator('#po-html')).to_be_visible()
            page.wait_for_timeout(300)
            return page
        def save(page):
            page.wait_for_timeout(250)
            return json.loads(page.evaluate('(key)=>localStorage.getItem(key)',KEY))
        def fill(page, code=PAGE, css=None):
            page.locator('#po-html').fill(code)
            if css is not None: page.locator('#po-css').fill(css)
        def visit(page):
            page.locator('#po-invite').click()
            expect(page.locator('#po-invite')).to_be_enabled()
            if page.locator('#po-finish').is_visible():page.locator('#po-finish').click()
        def stage(page,id):page.locator(f'[data-stage="{id}"]').click()
        def passed(page):assert 'can use this version' in page.locator('#po-feedback').inner_text() or 'observatory is open' in page.locator('#po-feedback').inner_text()
        def failed(page):assert 'got stuck' in page.locator('#po-feedback').inner_text()

        page=open_page()
        assert page.locator('#po-html').input_value()==''
        assert 'Opening tag' in page.locator('#po-pieces').inner_text()
        assert page.locator('#po-press').is_visible()
        page.locator('#po-label').fill('My <sky> & stars');page.locator('#po-add-heading').click()
        page.locator('#po-label').fill('A place to explore.');page.locator('#po-add-paragraph').click()
        assert '&lt;sky&gt; &amp;' in page.locator('#po-html').input_value()
        visit(page);passed(page)
        assert save(page)['observatory']['completed']==['paper']
        groups.append('novice press creates escaped real HTML; visitor reads it')

        before=page.locator('#po-html').input_value()
        page.locator('#po-demo-button').click();page.locator('#po-demo-render').click()
        expect(page.frame_locator('#po-demo-preview').locator('h1')).to_have_text('The Moon Post')
        page.locator('#po-demo-close').click();assert page.locator('#po-html').input_value()==before
        page.locator('#po-next').click();page.locator('#po-frame').click();visit(page);failed(page)
        code=page.locator('#po-html').input_value().replace('<title></title>','<title>My observatory</title>')
        fill(page,code);visit(page);passed(page)
        expect(page.locator('#po-tab')).to_have_text('My observatory')
        groups.append('worked example never overwrites draft; title differs from h1')

        stage(page,'paths');fill(page,PAGE.replace('href="#north-map"','href="#when"'));visit(page);failed(page)
        assert 'Arrived at #when' in page.locator('#po-visitors').inner_text()
        fill(page,PAGE);visit(page);passed(page)
        fill(page,PAGE.replace('</body>','<p id="north-map">Duplicate north</p></body>'));visit(page);failed(page)
        assert 'Two or more' in page.locator('#po-visitors').inner_text()
        fill(page,PAGE.replace('href="#north-map"','href="#NORTH-map"'));visit(page);failed(page)
        fill(page,PAGE.replace('href="#north-map"','href="#north%2Dmap"'));visit(page);passed(page)
        groups.append('actual destinations, duplicate IDs, case-sensitive and encoded fragments')

        stage(page,'notices');fill(page,PAGE,CSS);visit(page);passed(page)
        fill(page,PAGE,CSS+'body{opacity:0}');visit(page);failed(page)
        fill(page,PAGE,CSS+'.notice{padding:0}');visit(page);failed(page)
        fill(page,PAGE,'.notice{font-size:1.25rem;padding:1rem}');visit(page);passed(page)
        fill(page,PAGE,'p{font-size:16px} .wrong{font-size:24px;padding:20px}');visit(page);failed(page)
        groups.append('computed CSS, cascade, alternate units and hidden ancestors')

        stage(page,'opening');fill(page,PAGE,CSS);visit(page);failed(page)
        complete=PAGE.replace('</body>','<p class="notice">Leave room for others.</p></body>')
        fill(page,complete,CSS);visit(page);passed(page)
        assert save(page)['observatory']['completed']==['paper','document','paths','notices','opening']
        original=save(page)['observatory']['html']
        groups.append('five-stage cumulative page and third reusable notice')
        if args.screenshots:
            args.screenshots.mkdir(parents=True,exist_ok=True)
            page.screenshot(path=str(args.screenshots/'opening-night.png'),full_page=True)

        # Changes during a journey cancel the stale report instead of awarding success.
        stage(page,'paths');fill(page,PAGE);page.locator('#po-invite').click()
        expect(page.locator('#po-step')).to_be_visible()
        fill(page,'<p>New version</p>')
        expect(page.locator('#po-step')).to_be_hidden()
        assert 'page changed' in page.locator('#po-feedback').inner_text()
        fill(page,complete,CSS)
        page.locator('#po-html').focus();page.keyboard.press('Tab')
        assert page.evaluate('document.activeElement.id')!='po-html'
        groups.append('edits invalidate old journeys; editor has no Tab trap')

        # Sandbox: scripts and remote links are removed from the real rendered document.
        hostile=complete.replace('</body>','<script>parent.hacked=1</script><img src="https://example.invalid/pixel"><a href="javascript:alert(1)">Bad</a></body>')
        fill(page,hostile,CSS);visit(page)
        frame=page.frame_locator('#po-frame-slot iframe')
        assert frame.locator('script,img').count()==0
        assert frame.locator('a').last.get_attribute('href') is None
        assert page.evaluate('window.hacked') is None
        assert 'default-src' in frame.locator('meta[http-equiv]').get_attribute('content')
        assert frame.locator('meta[charset]').get_attribute('charset')=='UTF-8'
        fill(page,complete,CSS)
        groups.append('sanitized iframe removes executable and remote content')

        # Observe the generated Blobs; offline harness does not test the browser download UI.
        page.evaluate('''()=>{window.exportBlobs=[];window.originalCreateURL=URL.createObjectURL;
          window.originalAnchorClick=HTMLAnchorElement.prototype.click;
          URL.createObjectURL=b=>{window.exportBlobs.push(b);return window.originalCreateURL(b);};
          HTMLAnchorElement.prototype.click=function(){};
        }''')
        page.locator('#po-export-page').click();page.locator('#po-save-export').click()
        exported=page.evaluate('async()=>Promise.all(window.exportBlobs.map(b=>b.text()))')
        assert '<!doctype html>' in exported[0] and 'font-size:20px' in exported[0]
        assert '<script' not in exported[0]
        assert json.loads(exported[1])['observatory']['html']==complete
        page.evaluate('''()=>{URL.createObjectURL=window.originalCreateURL;
          HTMLAnchorElement.prototype.click=window.originalAnchorClick;}''')
        groups.append('standalone page and whole-save export Blobs contain the current work')

        # Separate assessment draft and durable assistance tracking.
        page.locator('#po-desk').click();page.locator('[data-check="reading-room"]').click()
        assert page.locator('#po-html').input_value()==''
        assert save(page)['observatory']['html']==original
        visit(page);assert save(page)['observatory']['evidence'][-1]['kind']=='first-unassisted'
        page.locator('#po-help').click();assert save(page)['observatory']['check']['assisted']
        reading=PAGE.replace('Chart of the sky','Catalogue').replace('Opening hours','Returns').replace('Look north for the stars.','Find fiction here.').replace('We open at dusk.','Return books Tuesday.')
        fill(page,reading,CSS);visit(page)
        evidence=save(page)['observatory']['evidence'][-1]
        assert evidence['success'] and evidence['kind']=='supported'
        page.locator('#po-return').click();assert page.locator('#po-html').input_value()==original
        page.locator('#po-desk').click();page.locator('#po-resume').click()
        assert page.locator('#po-html').input_value()==reading
        groups.append('separate drafts, feedback retries and help never count as fresh success')

        raw=json.dumps(save(page));reloaded=open_page(raw)
        assert reloaded.locator('#po-html').input_value()==reading
        assert save(reloaded)['observatory']['check']['assisted']
        if not args.offline_harness:
            reloaded.reload()
            expect(reloaded.locator('#po-html')).to_have_value(reading)
            assert save(reloaded)['observatory']['check']['assisted']
        reloaded.locator('#po-return').click()
        reloaded.locator('#po-desk').click();reloaded.on('dialog',lambda d:d.accept())
        reloaded.locator('[data-check="reading-room"]').click()
        fill(reloaded,reading,CSS);visit(reloaded)
        assert save(reloaded)['observatory']['evidence'][-1]['kind']=='repeated'
        groups.append('save rehydration keeps drafts and repeat-task labels')

        corrupt=open_page('{broken');expect(corrupt.locator('#po-warning')).to_be_visible()
        assert corrupt.evaluate('(key)=>localStorage.getItem(key)',KEY)=='{broken'
        denied=open_page(blocked=True);expect(denied.locator('#po-warning')).to_be_visible()
        denied.locator('#po-label').fill('In memory');denied.locator('#po-add-heading').click()
        assert 'In memory' in denied.locator('#po-html').input_value()
        groups.append('corrupt/blocked storage warns without overwriting the existing value')

        mobile=open_page();mobile.set_viewport_size({'width':390,'height':844})
        assert mobile.evaluate('document.documentElement.scrollWidth')<=390
        assert mobile.locator('#po-press').is_visible()
        if args.screenshots:mobile.screenshot(path=str(args.screenshots/'mobile-first-step.png'),full_page=True)
        assert not errors,errors
        groups.append('390px layout fits and no uncaught page errors')
        browser.close()
    if server:server.shutdown()
    print('MODE:', 'OFFLINE HARNESS: bundled scripts and substitute storage' if args.offline_harness else 'NATIVE HTTP / ES modules / localStorage')
    for i,label in enumerate(groups,1):print(f'PASS {i}: {label}')
    print(f'{len(groups)} browser acceptance groups passed.')

if __name__=='__main__':main()
