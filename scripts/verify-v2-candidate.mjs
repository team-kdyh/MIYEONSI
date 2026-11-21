// Free verification only. Live smoke runners are deliberately excluded.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import os from 'node:os';
const dir='docs/v2-ac7-current';
mkdirSync(dir,{recursive:true});
const results=[];
const commands=[
 ['typecheck','npm.cmd run typecheck'],
 ['build','npm.cmd run build'],
 ['unit','npm.cmd test'],
 ['browser','npx.cmd playwright test'],
 ['art-boundaries','npx.cmd playwright test --config playwright.v2-art.config.ts'],
 ['receipt-replay','npx.cmd tsx tests/v2-ac3-receipt-audit.ts'],
];
const suffix=process.argv.includes('--final')?'-final':process.argv.includes('--retry')?'-retry':'';
const retry=!!suffix;
for(const [name,command] of commands.filter(([name])=>!retry||['typecheck','build','browser'].includes(name))){
 const startedAt=new Date().toISOString();
 const r=spawnSync('powershell.exe',['-NoProfile','-Command',command],{encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,OPENAI_API_KEY:'',FORCE_COLOR:'0'}});
 const log=`${dir}/${name}${suffix}.txt`;
 writeFileSync(log,`${r.stdout??''}\n${r.stderr??''}`);
 results.push({name,command,startedAt,finishedAt:new Date().toISOString(),exitCode:r.status,error:r.error?.message,log});
 writeFileSync(`${dir}/runs${suffix}.json`,JSON.stringify({environment:{platform:os.platform(),release:os.release(),node:process.version,cwd:process.cwd(),shell:'powershell.exe -NoProfile',paidCalls:0},results},null,2));
 console.log(`${name}: exit ${r.status}; ${log}`);
 if(r.status!==0)process.exitCode=1;
}
