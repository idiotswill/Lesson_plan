"""Browser acceptance tests. --offline-harness uses a documented CPython bridge.
Normal mode exercises localhost + real Pyodide; offline mode does NOT verify the
CDN, Pyodide bootstrap, or browser-worker boundary. No test APIs ship in the app.
Requires: pip install playwright; python -m playwright install chromium
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--offline-harness',action='store_true')
parser.add_argument('--url',default='http://127.0.0.1:8000/')
parser.add_argument('--screenshots',default='test-results')
args=parser.parse_args()
OUT=Path(args.screenshots);OUT.mkdir(exist_ok=True,parents=True)
worker=(ROOT/'src/python-worker.js').read_text()
harness=worker.split('const HARNESS=String.raw`',1)[1].split('`;',1)[0]
# Preserve the harness's final expression, just as runPythonAsync does.
py_harness=harness.rsplit('json.dumps(results, allow_nan=False)',1)[0]
def run_python(payload):
    ns={'__payload_json':json.dumps(payload)}
    try:
        exec(py_harness,ns,ns)
        return {'type':'result','results':ns['results']}
    except BaseException as e:
        return {'type':'error','phase':'execution','message':type(e).__name__+': '+str(e)}


def load_harness(page):
    html=(ROOT/'index.html').read_text()
    html=html.replace('<link rel="stylesheet" href="styles.css">','<style>'+(ROOT/'styles.css').read_text()+'</style>')
    html=html.replace('<link rel="stylesheet" href="teaching.css">','<style>'+(ROOT/'teaching.css').read_text()+'</style>')
    html=html.replace('<script type="module" src="src/app.js"></script>','')
    page.set_content(html)
    page.evaluate("""() => {
      const values = {};
      Object.defineProperty(window, 'localStorage', {value:{getItem:k=>values[k]??null,setItem:(k,v)=>values[k]=v}});
      window.Worker = class {
        constructor() {this.dead=false;setTimeout(()=>this.onmessage?.({data:{type:'ready'}}),20);}
        postMessage(data) {this.onmessage?.({data:{type:'running'}});window.__runPython(data).then(result=>{if(!this.dead)this.onmessage?.({data:result});});}
        terminate(){this.dead=true;}
      };
    }""")
    files=['content.js','core.js','world.js','python.js','web-workshop.js','teaching-content.js','teaching.js','app.js']
    code='\n'.join(re.sub(r'^import .*?;\n','',(ROOT/'src'/f).read_text(),flags=re.M).replace('export ','') for f in files)
    code=code.replace("new URL('./python-worker.js',import.meta.url)","'offline-test-worker'")
    page.add_script_tag(content=code,type='module')

with sync_playwright() as p:
    # A system Chromium is useful in an offline test environment.
    executable=shutil.which('chromium')
    browser=p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox','--disable-gpu'])
    page=browser.new_page(viewport={'width':1440,'height':1100})
    page.set_default_timeout(12000)
    page.on('dialog',lambda d:d.accept())
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    if args.offline_harness:
        page.expose_function('__runPython',run_python)
        load_harness(page)
    else:
        page.goto(args.url)
    page.locator('#begin-button').click()
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/'home.png'),full_page=True)
    def open_lesson(island,lesson):
        if page.locator('#mission').evaluate('(e)=>e.open'):
            page.locator('.close-mission').click()
        page.locator(f'[data-island="{island}"]').click()
        page.locator(f'[data-lesson="{lesson}"]').click()
        if page.locator('#guided-teaching').is_visible():
            page.locator('#guide-skip').click()
    def run_ok():
        page.locator('#run-button').click()
        page.wait_for_function("document.querySelector('#feedback').classList.contains('success')",timeout=70000)
    # Full novice path: teach -> demonstrate -> guided step -> challenge.
    guides=json.loads(subprocess.check_output(['node','--input-type=module','-e',
        "import {GUIDES} from './src/teaching-content.js'; console.log(JSON.stringify(GUIDES));"],cwd=ROOT))
    warmups=0
    for lesson_id,guide_data in guides.items():
        island={'set':'sets','py':'python','web':'web'}[lesson_id.split('-')[0]]
        # Don't use open_lesson: that helper deliberately skips for regression tests.
        if page.locator('#mission').evaluate('(e)=>e.open'):page.locator('.close-mission').click()
        page.locator(f'[data-island="{island}"]').click()
        page.locator(f'[data-lesson="{lesson_id}"]').click()
        expect(page.locator('#guided-teaching')).to_be_visible()
        expect(page.locator('.mission-layout')).to_be_hidden()
        for i,step in enumerate(guide_data['steps']):
            print('  Teaching:',lesson_id,i+1,step['title'],flush=True)
            expect(page.locator('#guide-title')).to_have_text(step['title'])
            if lesson_id=='set-union' and i==0:
                page.screenshot(path=str(OUT/'teach-sets.png'),full_page=True)
            frames=step.get('frames',[])
            if frames:
                expect(page.locator('#guide-next')).to_be_disabled()
                for j in range(1,len(frames)):page.locator('#guide-frame-next').click()
                if lesson_id=='py-loop':page.screenshot(path=str(OUT/'teach-loop.png'),full_page=True)
            q=step.get('question')
            if q:
                warmups+=1
                expect(page.locator('#guide-next')).to_be_disabled()
                if q['type']=='choice':
                    wrong=next(v for v,_ in q['options'] if v!=q['answer'])
                    page.locator('[data-guide-choice]').filter(has_text=next(label for v,label in q['options'] if v==wrong)).first.click()
                    expect(page.locator('#guide-next')).to_be_disabled()
                    expect(page.locator('#guide-feedback')).to_contain_text(q['wrong'])
                    for b in page.locator('[data-guide-choice]').all():
                        if b.get_attribute('data-guide-choice')==q['answer']:b.click();break
                elif q['type']=='set':
                    page.locator('#guide-submit').click()
                    expect(page.locator('#guide-next')).to_be_disabled()
                    for n in q['answer']:page.locator(f'[data-token="{n}"]').click()
                    page.locator('#guide-submit').click()
                else:
                    # Blank must never equal zero, or a correct text/HTML answer.
                    page.locator('#guide-submit').click()
                    expect(page.locator('#guide-next')).to_be_disabled()
                    page.locator('#guide-answer').fill(str(q['answer']))
                    page.locator('#guide-submit').click()
                expect(page.locator('#guide-next')).to_be_enabled()
                expect(page.locator('#guide-feedback')).to_have_text(q['why'])
                if lesson_id=='web-structure' and q['type']=='html':
                    expect(page.frame_locator('#guide-live').locator('p')).to_have_text('Hello stars')
                    page.screenshot(path=str(OUT/'teach-web.png'),full_page=True)
            # Close and reopen halfway through first guide: resume without losing place.
            if lesson_id=='set-union' and i==2:
                page.locator('.close-mission').click()
                page.locator('[data-lesson="set-union"]').click()
                expect(page.locator('#guide-title')).to_have_text(step['title'])
                for j in range(1,len(frames)):page.locator('#guide-frame-next').click()
            page.locator('#guide-next').click()
        expect(page.locator('#guided-teaching')).to_be_hidden()
        expect(page.locator('.mission-layout')).to_be_visible()
    assert page.locator('#lantern-count').inner_text()=='0 / 3'
    page.locator('.close-mission').click()
    page.locator('#save-button').click()
    with page.expect_download() as event:page.locator('#export-button').click()
    guided_save=json.loads(Path(event.value.path()).read_text())
    assert guided_save['completed']==[] and guided_save['evidence']==[]
    assert len(guided_save['guides'])==10 and all(g['finished'] for g in guided_save['guides'].values())
    page.locator('[data-close="settings"]').click()
    print(f'PASS: all 10 teaching paths, {warmups} guided tasks, trace frames, incorrect-answer feedback, resume; no mastery/story credit')
    # Help requested during a check must taint that check, not erase the attempt.
    open_lesson('sets','set-union');page.locator('#check-mode').click()
    page.locator('#tutorial-replay').click();page.locator('#guide-next').click()
    page.locator('#guide-reveal').click();expect(page.locator('#guide-next')).to_be_enabled()
    page.locator('#guide-skip').click()
    page.locator('#solution-button').click()
    value=re.search(r'= (\{[^}]*\})',page.locator('#solution-text').inner_text()).group(1)
    page.locator('#set-answer').fill(value);run_ok()
    expect(page.locator('#feedback')).to_contain_text('supported')
    print('PASS: step reveal/replay can rescue a stuck learner and supported checks are labelled honestly')
    # Real set selection buttons, including a wrong attempt then correction.
    for op in ['union','intersection','difference','complement']:
        open_lesson('sets','set-'+op)
        if op=='union':
            page.locator('#run-button').click()
            assert 'failure' in page.locator('#feedback').get_attribute('class')
        for b in page.locator('.firefly').all():
            name=b.get_attribute('aria-label');a=('member of A' in name);bb=('member of B' in name or 'A + B' in name)
            yes={'union':a or bb,'intersection':a and bb,'difference':a and not bb,'complement':not a}[op]
            if yes:b.click()
        if op=='union':page.screenshot(path=str(OUT/'sets.png'),full_page=True)
        run_ok()
    print('PASS: four set operations, wrong-answer feedback, world completion')
    # Fresh numeric check, hidden teaching examples, and supported-evidence state.
    page.locator('#check-mode').click()
    assert not page.locator('#teach-box').is_visible()
    page.locator('#solution-button').click()
    answer=re.search(r'= (\{[^}]*\})',page.locator('#solution-text').inner_text()).group(1)
    page.locator('#set-answer').fill(answer);run_ok()
    assert 'supported' in page.locator('#feedback').inner_text().lower()
    print('PASS: check mode does not mislabel revealed answers as independent')
    # Actual Python harness; runtime differs only in offline mode, reported below.
    solutions={
        'py-energy':'energy = pods * 3 - leak',
        'py-decision':'fly = charged and wind < limit',
        'py-loop':'charge = 0\nstep = 1\nwhile step <= stops:\n    charge += step\n    step += 1'}
    for id,code in solutions.items():
        open_lesson('python',id)
        page.locator('#code-editor').fill(code);run_ok()
        assert page.locator('.test-row.bad').count()==0
        if id=='py-loop':
            page.screenshot(path=str(OUT/'python.png'),full_page=True)
            page.locator('#fresh-button').click()
            page.locator('#code-editor').fill('while True:\n    pass')
            page.locator('#run-button').click()
            page.wait_for_function("document.querySelector('#feedback').classList.contains('failure')",timeout=70000)
            assert 'Step limit' in page.locator('#result-details').inner_text()
    print('PASS: three Python tasks, boundary cases, trace and runaway-loop feedback')
    # Failed syntax is a failed check, not clean independent evidence.
    page.locator('#check-mode').click();page.locator('#code-editor').fill('while :')
    page.locator('#run-button').click();page.wait_for_function("document.querySelector('#feedback').classList.contains('failure')",timeout=70000)
    assert 'SyntaxError' in page.locator('#feedback').inner_text()
    # HTML DOM semantics, then anchor matching, then computed CSS on both nodes.
    open_lesson('web','web-structure')
    page.locator('#html-editor').fill('<title>The Paper Observatory</title><h1>A quiet sky</h1><p>Welcome, wandering stars.</p>')
    run_ok()
    open_lesson('web','web-links')
    target=re.search(r'link to #(\S+) and',page.locator('#task-brief').inner_text()).group(1)
    page.locator('#html-editor').fill(f'<a href="#{target}">Find the harbour</a><h2 id="{target}">Harbour</h2>');run_ok()
    open_lesson('web','web-css')
    page.locator('#css-editor').fill('.beacon {color:#ffd166; padding:16px;}');run_ok()
    page.screenshot(path=str(OUT/'web.png'),full_page=True)
    page.locator('#width-button').click();assert 'narrow' in page.locator('#web-preview').get_attribute('class')
    print('PASS: HTML structure, working anchor targets, computed CSS and narrow preview')
    # Preview must strip scripts/remote attributes and neutralise style terminators.
    page.locator('#html-editor').fill('<script>parent.__unsafe=true</script><img src="https://invalid.test/leak"><h1>Safe</h1>')
    page.locator('#css-editor').fill('</style><script>parent.__unsafe=true</script><meta http-equiv="refresh" content="0;url=https://invalid.test">')
    page.wait_for_timeout(600)
    assert page.evaluate('window.__unsafe') is None
    frame=page.frame_locator('#web-preview')
    assert frame.locator('script').count()==0
    assert frame.locator('meta[http-equiv="refresh"]').count()==0
    print('PASS: HTML/CSS injection payloads do not become executable preview markup')
    page.locator('.close-mission').click()
    assert page.locator('#lantern-count').inner_text()=='3 / 3'
    page.locator('#ending-button').click();assert page.locator('#ending').evaluate('(e)=>e.open')
    page.locator('[data-close="ending"]').click()
    page.locator('#save-button').click()
    with page.expect_download() as event:page.locator('#export-button').click()
    backup=Path(event.value.path()).read_text();s=json.loads(backup);assert len(s['completed'])==10
    page.locator('#import-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{broken'})
    expect(page.locator('#settings-message')).to_contain_text('not valid JSON')
    page.locator('#reset-button').click();assert page.locator('#lantern-count').inner_text()=='0 / 3'
    page.locator('#import-file').set_input_files({'name':'save.json','mimeType':'application/json','buffer':backup.encode()})
    expect(page.locator('#lantern-count')).to_have_text('3 / 3')
    page.locator('[data-close="settings"]').click()
    print('PASS: chapter ending, save export, bad-import protection, reset and restore')
    page.locator('[data-island="digital"]').click();assert page.locator('#task-list button').count()==0
    print('PASS: missing course material remains visibly pending')
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
    assert not errors,errors
    print('PASS: mobile page width and no uncaught JavaScript errors')
    print('MODE:', 'OFFLINE DOM HARNESS + actual local CPython (not Pyodide)' if args.offline_harness else 'LIVE localhost + actual Pyodide')
    browser.close()
