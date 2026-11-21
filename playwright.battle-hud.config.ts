import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'battle-hud.spec.ts',workers:1,outputDir:'test-results-battle-hud',use:{baseURL:'http://127.0.0.1:3097',browserName:'chromium'},webServer:{command:'npx vite preview --host 127.0.0.1 --port 3097 --strictPort',url:'http://127.0.0.1:3097',reuseExistingServer:false},reporter:'list'});
