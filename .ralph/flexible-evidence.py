from pathlib import Path
import json,hashlib,shutil,datetime
root=Path.cwd();probe=root/'.ralph/flexible-probe';dest=root/'docs/flexible-review';dest.mkdir(exist_ok=True)
assert 'pass 399' in (probe/'docs/flexible-unit.log').read_text(encoding='utf-8-sig')
assert 'pass 9' in (probe/'docs/flexible-focused-unit.log').read_text(encoding='utf-8-sig')
assert '34 passed' in (probe/'docs/flexible-browser.log').read_text(encoding='utf-8-sig')
assert '2 passed' in (probe/'docs/flexible-focused-browser.log').read_text(encoding='utf-8-sig')
assert 'built in' in (probe/'docs/flexible-build.log').read_text(encoding='utf-8-sig')
rows=[]
for folder in ['server','src','tests']:
 for p in (root/folder).rglob('*'):
  if p.is_file():
   rel=p.relative_to(root);assert p.read_bytes()==(probe/rel).read_bytes(),f'Drift: {rel}'
   rows.append({'file':rel.as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
for name in ['flexible-unit.log','flexible-focused-unit.log','flexible-browser.log','flexible-focused-browser.log','flexible-build.log']:
 shutil.copyfile(probe/'docs'/name,dest/name.replace('.log','.txt'))
shutil.copytree(probe/'docs/flexible-review',dest,dirs_exist_ok=True)
(dest/'source-verification.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Mock transport; zero paid API calls. Full unit run 399 passed; one additional agreement-repair test then focused 9 passed (400 distinct cases). Full browser 34 passed, 1 initial-state wait race in the new test; fixed wait, focused desktop/mobile 2 passed (35 distinct cases). No production code changed between full and focused runs. Exact final source comparison to isolated workspace.','files':rows},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'sourceFiles':len(rows),'unitDistinct':400,'browserDistinct':35}))
