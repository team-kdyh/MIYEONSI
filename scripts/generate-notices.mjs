import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const entries=[];
for(const [relative,entry] of Object.entries(lock.packages)){
  if(!relative||entry.dev)continue;
  const directory=path.join(root,relative);
  if(!fs.existsSync(path.join(directory,'package.json')))continue;
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8'));
  const licenses=fs.readdirSync(directory).filter(name=>/^licen[cs]e(?:\.|$)/i.test(name)&&fs.statSync(path.join(directory,name)).isFile());
  if(!licenses.length)throw Error(`Missing installed license text: ${manifest.name}`);
  entries.push({name:manifest.name,version:manifest.version,license:manifest.license,
    text:licenses.sort().map(name=>`${name}\n${fs.readFileSync(path.join(directory,name),'utf8').trim()}`).join('\n\n')});
}
entries.sort((a,b)=>a.name.localeCompare(b.name));
const header='AFTER HOURS — THIRD-PARTY NOTICES\n\n'+
  'Generated from package-lock.json and the installed production dependencies.\n'+
  'The license texts below apply to their respective third-party packages, not to the original game story or artwork.\n'+
  'Development-only tools are not included in this runtime inventory.\n'+
  'Regenerate after dependency changes: node scripts/generate-notices.mjs\n';
const body=entries.map(entry=>`\n${'='.repeat(72)}\n${entry.name} ${entry.version} (${entry.license})\n${'='.repeat(72)}\n\n${entry.text}\n`).join('');
fs.writeFileSync(path.join(root,'THIRD_PARTY_NOTICES.txt'),header+body,'utf8');
console.log(`Preserved license texts for ${entries.length} installed production dependencies.`);
