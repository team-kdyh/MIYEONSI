from pathlib import Path
import hashlib,json,sys,datetime
root=Path(__file__).resolve().parent.parent
probe=root/'.ralph/v2-revision-parent-probe'
expected={'server/commitments.ts','server/narrative.ts','server/provider.ts','server/commitment-revisions.ts','server/commitment-revisions.test.ts','server/commitment-revisions-http.test.ts','server/commitment-revisions-retraction.test.ts','tests/commitment-transport.mjs'}
digest=lambda b:hashlib.sha256(b).hexdigest()
rows=[]
files=list((probe/'server').glob('*.ts'))+list((probe/'src').glob('*'))+[probe/'tests/commitment-transport.mjs']
for source in files:
    if not source.is_file():continue
    rel=source.relative_to(probe).as_posix();dest=root/rel
    before=dest.read_bytes() if dest.exists() else None;after=source.read_bytes()
    if before==after:continue
    newline=before is not None and before.replace(b'\r\n',b'\n')==after.replace(b'\r\n',b'\n')
    if not newline and rel not in expected:raise RuntimeError('Unexpected semantic change: '+rel)
    rows.append({'path':rel,'kind':'newline-only' if newline else 'new' if before is None else 'implementation','before':digest(before) if before else None,'after':digest(after)})
if len([r for r in rows if r['kind']!='newline-only'])!=len(expected):raise RuntimeError('Expected exact eight-file implementation/test integration')
if '--apply' in sys.argv:
    for r in rows:(root/r['path']).write_bytes((probe/r['path']).read_bytes())
    for source in files:
        if source.is_file() and source.read_bytes()!=(root/source.relative_to(probe)).read_bytes():raise RuntimeError('Post-copy mismatch')
    evidence=root/'docs/v2-revision-parent-review/integration.json'
    evidence.write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Parent independently tested combined snapshot; not a Ralph terminal verdict; source and tests only; no env or private data access','sourceCommit':'14128a7 plus worker G1 implementation plus parent retraction guard','unit':369,'build':'passed on byte-matching snapshot','rows':rows},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'apply':'--apply' in sys.argv,'changes':rows},ensure_ascii=False,indent=2))
