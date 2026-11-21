import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:['v2-art.spec.ts','v2-ac4-boundaries.spec.ts'],workers:1,outputDir:'test-results-v2-art',use:{baseURL:'http://127.0.0.1:3034',browserName:'chromium'},webServer:{command:'npx vite --host 127.0.0.1 --port 3034 --strictPort',url:'http://127.0.0.1:3034',reuseExistingServer:false},reporter:'list'});
