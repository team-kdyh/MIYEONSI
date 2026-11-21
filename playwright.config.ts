import {defineConfig} from '@playwright/test';
// Active v2 regressions. The choice-based v1 specs/configs remain historical evidence.
const port=Number(process.env.AFTERHOURS_TEST_PORT??3061);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid browser test port');
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({testDir:'./tests',testMatch:['reading-recovery.spec.ts','v2-ui.spec.ts','v2-art.spec.ts','v2-audio.spec.ts','persistence.spec.ts','v2-journey.spec.ts','v2-ui-polish.spec.ts','v2-prop-withdrawal.spec.ts','v2-participation.spec.ts'],workers:1,outputDir:'test-results-v2-final',use:{baseURL,browserName:'chromium'},webServer:{command:'node --import ./tests/v2-browser-fixture.mjs --import tsx server/index.ts',url:baseURL,reuseExistingServer:false,env:{PORT:String(port),OPENAI_API_KEY:'isolated-mock-no-network',AFTERHOURS_DATA_DIR:`.ralph/v2-final/data-${Date.now()}`}},reporter:'list'});
