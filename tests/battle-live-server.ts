// Parent-only child. Never imports an env file or accepts a caller's save directory.
import {budgetedFetch} from '../scripts/battle-smoke-budget.ts';
import {resolve} from 'node:path';
if(process.env.BATTLE_LIVE_OWNER!=='parent-final-qa'||!process.env.OPENAI_API_KEY||process.env.PORT==='3001')throw Error('Parent harness required');
const data=resolve(process.env.AFTERHOURS_DATA_DIR||'');
if(!data.startsWith(resolve('docs/battle-ac5/live')+'/')&&!data.startsWith(resolve('docs/battle-ac5/live')+'\\'))throw Error('Isolated storage required');
globalThis.fetch=budgetedFetch(resolve(process.env.BATTLE_PARENT_LEDGER||'docs/battle-api-smoke-ledger.json'),globalThis.fetch);
process.env.AFTERHOURS_SKIP_ENV_FILE='1';
await import('../server/index.ts');
