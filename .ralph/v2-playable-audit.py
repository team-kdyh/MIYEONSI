from pathlib import Path,PurePosixPath
import zipfile,json,hashlib,re,datetime,sys
root=Path(__file__).resolve().parent.parent
archive=root/'artifacts/AFTER-HOURS-playable.zip'
hashbytes=lambda data:hashlib.sha256(data).hexdigest()
with zipfile.ZipFile(archive) as z:
    names=z.namelist()
    assert len(names)==len(set(names)), 'Duplicate archive paths'
    manifest=json.loads(z.read('PACKAGE-MANIFEST.json'))
    assert set(names)=={'PACKAGE-MANIFEST.json'}|{f['entry'] for f in manifest['files']}, 'Manifest coverage mismatch'
    checked=[]
    for f in manifest['files']:
        name=f['entry'];parts=PurePosixPath(name).parts
        assert not name.startswith('/') and '\\' not in name and '..' not in parts, 'Unsafe archive path'
        assert not set(parts)&{'.git','.ralph','.local-data','node_modules'}, 'Private archive path'
        assert not any(p.startswith('.env') and p!='.env.example' for p in parts), 'Private configuration'
        data=z.read(name);source=(root/f['source']).resolve()
        assert source.is_relative_to(root), 'Source escaped workspace'
        assert hashbytes(data)==f['sha256'] and len(data)==f['bytes'], 'Archive hash mismatch'
        assert data==source.read_bytes(), 'Current source mismatch: '+name
        assert not re.search(rb'sk-(?:proj-)?[A-Za-z0-9_-]{25,}',data), 'Credential-shaped payload; path only: '+name
        checked.append({'entry':name,'sha256':f['sha256']})
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':archive.relative_to(root).as_posix(),'sha256':hashbytes(archive.read_bytes()),'bytes':archive.stat().st_size,'payloadCount':len(checked),'result':'pass','scope':'Exact rebuilt playable ZIP versus current source. No private paths or credential-shaped contents found. Earlier separate installation evidence applies to baseline 14128a7; this rebuild is not a new fresh-install or live-model test.','files':checked}
assert result['sha256']==(root/'artifacts/AFTER-HOURS-playable.zip.sha256').read_text().split()[0]
destination=sys.argv[1] if len(sys.argv)>1 else 'docs/v2-revision-parent-review/playable-audit.json'
assert destination in {'docs/v2-revision-parent-review/playable-audit.json','docs/v2-audio-race-review/playable-audit.json','docs/v2-revision-g2-parent/playable-audit.json','docs/v2-prop-withdrawal-review/playable-audit.json'}, 'Explicit evidence destination required'
(root/destination).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:result[k] for k in ['result','payloadCount','bytes','sha256']}))
