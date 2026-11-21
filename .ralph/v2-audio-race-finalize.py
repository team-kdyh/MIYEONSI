from pathlib import Path
import hashlib,json,datetime,sys
root=Path(__file__).resolve().parent.parent;probe=root/'.ralph/v2-revision-parent-probe'
g2=sys.argv[1:]==['--g2']
assert not sys.argv[1:] or g2, 'Unknown finalization scope'
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
unit=374 if g2 else 371;browser=25 if g2 else 4
if g2:
    assert 'tests 374' in (probe/'docs/g2-parent-unit.log').read_text(encoding='utf-8-sig') and 'pass 374' in (probe/'docs/g2-parent-unit.log').read_text(encoding='utf-8-sig')
    assert '25 passed' in (probe/'docs/g2-parent-browser.log').read_text(encoding='utf-8-sig')
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':f'Current original runtime/test source and rendered assets exactly match the isolated {unit}-unit/build/{browser}-browser candidate. Non-rendered support manifests/docs are outside this comparison. No paid generation or listening inference.','unit':unit,'browser':browser,'source':rows,'rendered':rendered}
destination='docs/v2-revision-g2-parent/source-equivalence.json' if g2 else 'docs/v2-audio-race-review/source-equivalence.json'
(root/destination).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'sourceFiles':len(rows),'renderedFiles':len(rendered),'match':True}))
