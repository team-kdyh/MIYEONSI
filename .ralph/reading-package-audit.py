from pathlib import Path,PurePosixPath
import json,hashlib,zipfile,re,datetime
root=Path.cwd();archive=root/'artifacts/AFTER-HOURS-playable.zip';sha=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(archive) as z:
 names=z.namelist();assert len(names)==len(set(names));manifest=json.loads(z.read('PACKAGE-MANIFEST.json'))
 assert set(names)=={'PACKAGE-MANIFEST.json'}|{f['entry'] for f in manifest['files']}
 for f in manifest['files']:
  parts=PurePosixPath(f['entry']).parts
  assert not set(parts)&{'.git','.ralph','.local-data','node_modules','..'}
  assert not any(p.startswith('.env') and p!='.env.example' for p in parts)
  data=z.read(f['entry']);source=(root/f['source']).resolve();assert source.is_relative_to(root)
  assert sha(data)==f['sha256'] and len(data)==f['bytes'] and data==source.read_bytes(),f['entry']
  assert not re.search(rb'sk-(?:proj-)?[A-Za-z0-9_-]{25,}',data),'Credential-shaped payload'
 result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'pass','payloadCount':len(manifest['files']),'bytes':archive.stat().st_size,'sha256':sha(archive.read_bytes()),'scope':'Exact package/source and private-file exclusion audit; not a fresh installation or model-quality test'}
assert result['sha256']==(root/'artifacts/AFTER-HOURS-playable.zip.sha256').read_text().split()[0]
(root/'docs/reading-review/playable-audit.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
