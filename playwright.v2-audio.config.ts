import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'v2-audio.spec.ts',workers:1,outputDir:'test-results-v2-audio',use:{baseURL:'http://127.0.0.1:3035',browserName:'chromium'},webServer:{command:'npx vite --host 127.0.0.1 --port 3035 --strictPort',url:'http://127.0.0.1:3035',reuseExistingServer:false},reporter:'list'});
