from pathlib import Path
import hashlib,json,datetime
root=Path(__file__).resolve().parent.parent;probe=root/'.ralph/v2-revision-parent-probe'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for directory in ['server','src']:
    for p in (root/directory).rglob('*'):
        if not p.is_file():continue
        rel=p.relative_to(root);q=probe/rel
        assert q.exists() and p.read_bytes()==q.read_bytes(), 'Tested source mismatch: '+str(rel)
        rows.append({'path':rel.as_posix(),'sha256':sha(p)})
rendered=[]
for directory in ['public','dist']:
    for p in (root/directory).rglob('*'):
        if not p.is_file() or p.suffix not in {'.png','.ogg','.wav','.js','.css','.html'}:continue
        rel=p.relative_to(root);q=probe/rel
        assert q.exists() and p.read_bytes()==q.read_bytes(), 'Rendered file mismatch: '+str(rel)
        rendered.append({'path':rel.as_posix(),'sha256':sha(p)})
for name in ['package.json','package-lock.json','tsconfig.json','vite.config.ts']:
    assert (root/name).read_bytes()==(probe/name).read_bytes(), 'Build input mismatch'
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Current original runtime/test source and rendered assets exactly match the isolated 371-unit/build/4-audio-browser candidate. Non-rendered support manifests/docs are outside this comparison. No paid generation or listening inference.','unit':371,'audioBrowser':4,'source':rows,'rendered':rendered}
(root/'docs/v2-audio-race-review/source-equivalence.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'sourceFiles':len(rows),'renderedFiles':len(rendered),'match':True}))
