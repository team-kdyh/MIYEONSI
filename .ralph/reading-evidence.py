from pathlib import Path
import json,hashlib,shutil,datetime
root=Path.cwd();probe=root/'.ralph/reading-probe';dest=root/'docs/reading-review';dest.mkdir(exist_ok=True)
assert 'pass 391' in (probe/'docs/reading-unit.log').read_text(encoding='utf-8-sig')
assert '32 passed' in (probe/'docs/reading-browser.log').read_text(encoding='utf-8-sig')
assert '1 passed' in (probe/'docs/reading-journey.log').read_text(encoding='utf-8-sig')
assert 'built in' in (probe/'docs/reading-build.log').read_text(encoding='utf-8-sig')
rows=[]
for folder in ['server','src','tests']:
 for p in (root/folder).rglob('*'):
  if p.is_file():
   rel=p.relative_to(root);assert p.read_bytes()==(probe/rel).read_bytes(),f'Drift: {rel}'
   rows.append({'file':rel.as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
for name in ['reading-unit.log','reading-unit-before.log','reading-build.log','reading-browser.log','reading-journey.log','reading-focused.log','v2-recovery-evidence.json','v2-persistence-evidence.json']:
 shutil.copyfile(probe/'docs'/name,dest/name.replace('.log','.txt'))
shutil.copytree(probe/'docs/reading-review',dest/'screenshots',dirs_exist_ok=True)
(dest/'source-verification.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Isolated mock transport; no paid API; exact production/server/UI/test source comparison. Full browser run: 32 pass, one obsolete retry-label selector failed; updated selector and added live-state objective assertions, targeted journey passed. Production source unchanged between those runs.','unit':391,'browserCombined':33,'files':rows},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'sourceFiles':len(rows),'unit':391,'browser':33}))
