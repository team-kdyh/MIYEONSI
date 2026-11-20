import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',workers:1,use:{baseURL:'http://127.0.0.1:3017',browserName:'chromium'},webServer:{command:'npm start',url:'http://127.0.0.1:3017',reuseExistingServer:false,env:{PORT:'3017',OPENAI_API_KEY:''}},reporter:'list'});
