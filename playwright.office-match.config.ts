import {defineConfig} from '@playwright/test';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=process.env.AFTERHOURS_MATCH_FIXTURE??mkdtempSync(path.join(tmpdir(),'afterhours-match-'));
if(!process.env.AFTERHOURS_MATCH_FIXTURE){
 process.env.AFTERHOURS_MATCH_FIXTURE=dir;
 writeFileSync(path.join(dir,'clock'),String(Date.now()));
 writeFileSync(path.join(dir,'calls'),'');
}
const port=Number(process.env.AFTERHOURS_TEST_PORT??3178),baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({testDir:'./tests',testMatch:'office-match.spec.ts',workers:1,use:{baseURL,browserName:'chromium'},reporter:'list',webServer:{
 command:'node --import ./tests/office-match-provider.mjs --import tsx server/index.ts',url:baseURL,reuseExistingServer:false,
 env:{PORT:String(port),AFTERHOURS_SKIP_ENV_FILE:'1',AFTERHOURS_MATCH_FIXTURE:dir,AFTERHOURS_DATA_DIR:path.join(dir,'profiles'),OPENAI_API_KEY:'mock-no-network'}
}});
