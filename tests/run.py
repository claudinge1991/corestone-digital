#!/usr/bin/env python3
"""Offline checks for the static site: route smoke test + CAD intake browser tests.

Usage: python3 tests/run.py   (needs Google Chrome; no network, no Node)
"""
import functools, http.server, os, re, subprocess, sys, tempfile, threading, time, xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
BASE = '/corestone-digital'


def serve():
    # Serve the repo under /corestone-digital/ to match GitHub Pages paths.
    tmp = tempfile.mkdtemp()
    os.symlink(ROOT, os.path.join(tmp, 'corestone-digital'))
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=tmp)
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f'http://127.0.0.1:{httpd.server_address[1]}'


def dump_dom(url, budget_ms=5000, timeout=60):
    # Chrome prints the DOM but may not exit on its own (updater), so stop it once </html> arrives.
    with tempfile.TemporaryDirectory() as profile, tempfile.TemporaryFile('w+') as out:
        proc = subprocess.Popen([CHROME, '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                                 '--disable-component-update', f'--user-data-dir={profile}',
                                 f'--virtual-time-budget={budget_ms}', '--dump-dom', url],
                                stdout=out, stderr=subprocess.DEVNULL, text=True)
        deadline = time.time() + timeout
        try:
            while time.time() < deadline and proc.poll() is None:
                out.seek(0)
                if '</html>' in out.read():
                    break
                time.sleep(0.2)
        finally:
            proc.kill(); proc.wait()
        out.seek(0)
        return out.read()


def main():
    failures = []
    httpd, origin = serve()
    try:
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        locs = [l.text for l in ET.parse(os.path.join(ROOT, 'sitemap.xml')).findall('.//s:loc', ns)]
        site_js = open(os.path.join(ROOT, 'assets/site.js')).read()
        for loc in locs:
            path = loc.split('/corestone-digital', 1)[1]
            html_path = os.path.join(ROOT, path.strip('/'), 'index.html')
            if not os.path.exists(html_path):
                failures.append(f'{path}: missing index.html'); continue
            page = re.search(r'data-page="([^"]+)"', open(html_path).read()).group(1)
            if page != 'home' and not re.search(rf"(^|[,{{\n])'?{re.escape(page)}'?:", site_js, re.M):
                failures.append(f'{path}: data-page "{page}" has no entry in site.js')
        print(f'routes: {len(locs)} sitemap URLs checked')

        home = dump_dom(f'{origin}{BASE}/')
        for needle in [f'href="{BASE}/cad/"', 'CAD &amp; 3D Design', 'Keep the property moving', 'FieldOps Pro']:
            if needle not in home:
                failures.append(f'home: missing {needle!r}')
        digital = dump_dom(f'{origin}{BASE}/digital/')
        for needle in ['Now $499', 'Websites that explain']:
            if needle not in digital:
                failures.append(f'digital: missing {needle!r} (existing content changed?)')
        print('home/digital: existing content and CAD card checked')

        dom = dump_dom(f'{origin}{BASE}/tests/cad-tests.html', 10000)
        m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
        report = m.group(1) if m else 'NO OUTPUT'
        print(report)
        if 'DONE' not in report:
            failures.append('cad-tests: did not finish')
        failures += [l for l in report.splitlines() if l.startswith('FAIL')]
    finally:
        httpd.shutdown()
    print('\n'.join(['', *failures, f'{"FAILED" if failures else "OK"}: {len(failures)} failure(s)']))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
