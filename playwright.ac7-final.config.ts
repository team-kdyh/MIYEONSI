import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./tests',
 workers:1,
 outputDir:'test-results-ac7-final',
 use:{baseURL:'http://127.0.0.1:3037',browserName:'chromium'},
 webServer:{
  command:'npm start',
  url:'http://127.0.0.1:3037',
  reuseExistingServer:false,
  env:{PORT:'3037',OPENAI_API_KEY:'',AFTERHOURS_DATA_DIR:`.ralph/ac7-final/data-${Date.now()}`},
 },
 reporter:'list',
});
