import {defineConfig} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export default defineConfig({
 testDir:'./tests',testMatch:'office.spec.ts',workers:1,
 outputDir:'test-results-ac2-final',
 use:{baseURL:'http://127.0.0.1:3032',browserName:'chromium'},
 webServer:{command:'npm start',url:'http://127.0.0.1:3032',reuseExistingServer:false,
  env:{PORT:'3032',OPENAI_API_KEY:'',AFTERHOURS_DATA_DIR:mkdtempSync(join(tmpdir(),'afterhours-ac2-'))}},
 reporter:'list',
});
