from pathlib import Path
import hashlib,json,datetime,subprocess,urllib.request,shutil
root=Path(__file__).resolve().parent.parent;probe=root/'.ralph/v2-revision-parent-probe';dest=root/'docs/v2-prop-withdrawal-review'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert 'pass 375' in (probe/'docs/prop-full-unit.log').read_text(encoding='utf-8-sig')
assert '27 passed' in (probe/'docs/prop-full-browser.log').read_text(encoding='utf-8-sig')
rows=[]
for directory in ['server','src','dist','public']:
 for p in (root/directory).rglob('*'):
  if not p.is_file():continue
  if directory in ['dist','public'] and p.suffix not in {'.png','.ogg','.wav','.js','.css','.html'}:continue
  rel=p.relative_to(root);q=probe/rel
  assert q.exists() and p.read_bytes()==q.read_bytes(),str(rel)
  rows.append({'path':rel.as_posix(),'sha256':sha(p.read_bytes())})
for rel in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','tests/v2-prop-withdrawal.spec.ts']:
 assert (root/rel).read_bytes()==(probe/rel).read_bytes(),rel
for src,name in [('prop-full-unit.log','unit.log'),('prop-full-browser.log','browser.log')]:shutil.copyfile(probe/'docs'/src,dest/name)
with urllib.request.urlopen('http://127.0.0.1:3001/') as response:
 html=response.read();assert response.status==200 and html==(root/'dist/index.html').read_bytes()
 runtime={'status':response.status,'url':response.url,'htmlSHA256':sha(html),'scope':'Passive GET only; existing original server serves exactly the newly built frontend. No /turn or model call.'}
for name,data in [('source-equivalence.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'unit':375,'browser':27,'scope':'Exact source/rendered byte match to isolated free-test candidate; metadata manifests are not rendering inputs.','files':rows}),('runtime.json',runtime)]:
 (dest/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
old=subprocess.check_output(['git','show','503f817:src/visualAssets.ts'],cwd=root)
(dest/'visualAssets-before.txt').write_bytes(old);(dest/'visualAssets-after.txt').write_bytes((root/'src/visualAssets.ts').read_bytes())
print(json.dumps({'unit':375,'browser':27,'sourceAndRendered':len(rows),'runtime':runtime['status']}))
