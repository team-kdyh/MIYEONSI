import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./verification/ac3',workers:1,outputDir:'test-results-ac3-final',use:{baseURL:'http://127.0.0.1:3033',browserName:'chromium'},webServer:{command:'npm start',url:'http://127.0.0.1:3033',reuseExistingServer:false,env:{PORT:'3033',OPENAI_API_KEY:'',AFTERHOURS_DATA_DIR:'.ralph/ac3-final/data'}},reporter:'list'});


