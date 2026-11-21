from pathlib import Path
import hashlib,json,datetime,urllib.request,shutil
root=Path(__file__).resolve().parent.parent;probe=root/'.ralph/v2-g3-review-probe';dest=root/'docs/v2-g3-parent-integration'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert 'pass 388' in (dest/'unit.log').read_text(encoding='utf-8-sig')
assert '28 passed' in (dest/'browser.log').read_text(encoding='utf-8-sig')
rows=[]
for directory in ['server','src','dist','public']:
 for p in (root/directory).rglob('*'):
  if not p.is_file():continue
  if directory in ['dist','public'] and p.suffix not in {'.png','.ogg','.wav','.js','.css','.html'}:continue
  rel=p.relative_to(root);q=probe/rel
  assert q.exists() and p.read_bytes()==q.read_bytes(),str(rel)
  rows.append({'path':rel.as_posix(),'sha256':sha(p.read_bytes())})
for rel in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','tests/v2-participation.spec.ts','tests/v2-prop-withdrawal.spec.ts','tests/commitment-transport.mjs']:
 assert (root/rel).read_bytes()==(probe/rel).read_bytes(),rel
with urllib.request.urlopen('http://127.0.0.1:3001/') as response:
 html=response.read();assert response.status==200 and html==(root/'dist/index.html').read_bytes()
 runtime={'status':response.status,'url':response.url,'htmlSHA256':sha(html),'scope':'Passive GET after actual original launcher stop/rebuild/start. No /turn or model call.'}
for name,data in [('source-equivalence.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'unit':388,'browser':28,'scope':'Exact source/rendered byte match to isolated free-test candidate; metadata manifests are not rendering inputs.','files':rows}),('runtime.json',runtime)]:
 (dest/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
for source,name in [('docs/v2-contract-followup/normal-turn-trace.json','normal-turn-trace.json'),('docs/v2-contract-followup/applicability-trace.json','applicability-trace.json'),('docs/v2-contract-followup/lifecycle-http-trace.json','lifecycle-http-trace.json')]:shutil.copyfile(probe/source,dest/name)
shutil.copytree(probe/'docs/v2-contract-followup/participation',dest/'participation',dirs_exist_ok=True)
print(json.dumps({'unit':388,'browser':28,'sourceAndRendered':len(rows),'runtime':runtime['status']}))
