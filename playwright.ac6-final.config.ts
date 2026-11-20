import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./tests',
 testMatch:'persistence.spec.ts',
 workers:1,
 outputDir:'test-results-ac6-final',
 use:{baseURL:'http://127.0.0.1:3036',browserName:'chromium'},
 webServer:{
  command:'npm start',
  url:'http://127.0.0.1:3036',
  reuseExistingServer:false,
  env:{PORT:'3036',OPENAI_API_KEY:'',AFTERHOURS_DATA_DIR:`.ralph/ac6-final/data-${Date.now()}`},
 },
 reporter:'list',
});
