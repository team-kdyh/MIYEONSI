import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./tests',
 testMatch:'play.spec.ts',
 workers:1,
 outputDir:'test-results-ac1-final',
 use:{baseURL:'http://127.0.0.1:3031',browserName:'chromium'},
 webServer:{
  command:'npm start',
  url:'http://127.0.0.1:3031',
  reuseExistingServer:false,
  env:{PORT:'3031',OPENAI_API_KEY:'',AFTERHOURS_DATA_DIR:`.ralph/ac1-final/data-${Date.now()}`},
 },
 reporter:'list',
});
