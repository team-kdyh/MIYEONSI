from pathlib import Path
import hashlib,json,sys,datetime,shutil
root=Path(__file__).resolve().parent.parent;probe=root/'.ralph/v2-g3-review-probe';frozen=root/'.ralph/v2-g3-worker-final';dest=root/'docs/v2-g3-parent-integration'
sha=lambda data:hashlib.sha256(data).hexdigest()
expected={'server/commitment-revisions.ts','server/commitments-storage-review.test.ts','server/commitments.ts','server/dialogue.ts','server/evidence-applicability.test.ts','server/evidence-applicability.ts','server/index.ts','server/narrative.ts','server/performance-interpretation.ts','server/provider.ts','server/revision-negotiation-http.test.ts','server/revision-negotiation.test.ts','server/revision-negotiation.ts','server/revision-response-scope.test.ts','tests/commitment-transport.mjs','tests/v2-participation.spec.ts','playwright.config.ts'}
parent_modified={'server/index.ts','server/narrative.ts','server/commitment-revisions.ts','server/revision-negotiation.ts','server/music.test.ts','server/visual-binding.test.ts'}
manifest=json.loads((dest/'worker/candidate.json').read_text(encoding='utf8'))['components']
for p in (frozen/'server').glob('*.ts'):
 rel=p.relative_to(frozen).as_posix();assert sha(p.read_bytes())==manifest[rel],'Frozen worker mismatch: '+rel
 if rel not in parent_modified:assert (probe/rel).read_bytes()==p.read_bytes(),'Unreviewed worker delta: '+rel
for p in (root/'src').glob('*'):
 if p.is_file():assert p.read_bytes()==(probe/'src'/p.name).read_bytes(),'Parent UI/music changed'
for rel in ['scripts/start-local.ps1','scripts/stop-local.ps1','scripts/package-playable.ps1','package.json','package-lock.json','tsconfig.json','vite.config.ts']:
 assert (probe/rel).read_bytes()==(root/rel).read_bytes(),'Parent launch/build input changed: '+rel
files=[*(probe/'server').glob('*.ts'),probe/'tests/commitment-transport.mjs',probe/'tests/v2-participation.spec.ts',probe/'playwright.config.ts']
rows=[]
for p in files:
 rel=p.relative_to(probe).as_posix();q=root/rel;before=q.read_bytes() if q.exists() else None;after=p.read_bytes()
 if before==after:continue
 newline=before is not None and before.replace(b'\r\n',b'\n')==after.replace(b'\r\n',b'\n')
 rows.append({'path':rel,'kind':'newline-only' if newline else 'implementation','before':sha(before) if before is not None else None,'after':sha(after)})
assert {r['path'] for r in rows if r['kind']!='newline-only'}==expected,'Unexpected root delta'
if '--apply' in sys.argv:
 assert 'pass 388' in (probe/'docs/g3-final-unit.log').read_text(encoding='utf-8-sig')
 assert '28 passed' in (probe/'docs/g3-final-browser.log').read_text(encoding='utf-8-sig')
 assert 'built in' in (probe/'docs/g3-final-build.log').read_text(encoding='utf-8-sig')
 for r in rows:(root/r['path']).write_bytes((probe/r['path']).read_bytes())
 for p in files:assert p.read_bytes()==(root/p.relative_to(probe)).read_bytes()
 for source,name in [('g3-final-unit.log','unit.log'),('g3-final-build.log','build.log'),('g3-final-browser.log','browser.log'),('g3-combined-unit.log','preceding-unit.log'),('g3-combined-build.log','preceding-build.log'),('g3-combined-browser.log','preceding-browser.log')]:shutil.copyfile(probe/'docs'/source,dest/name)
 (dest/'integration.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'unit':388,'browser':28,'scope':'G3 frozen worker source plus parent response-scope, old withdrawal, error-copy, audio, prop and launcher fixes. No paid calls. This is parent integration, not the official Ralph verdict.','rows':rows},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'apply':'--apply' in sys.argv,'semanticChanges':len(expected),'rows':rows},ensure_ascii=False))
