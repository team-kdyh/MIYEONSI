import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'v2-ui.spec.ts',workers:1,use:{baseURL:'http://127.0.0.1:3028',browserName:'chromium'},webServer:{command:'npx vite --host 127.0.0.1 --port 3028 --strictPort',url:'http://127.0.0.1:3028',reuseExistingServer:false},reporter:'list'});
