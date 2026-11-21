// Test child only: deny every external request and count attempted Responses calls.
import {appendFile} from 'node:fs/promises';
globalThis.fetch=async(url)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')throw Error('Unexpected external request');
 await appendFile(process.env.V2_CALL_COUNTER,'call\n');
 return new Response('private provider diagnostic must never reach client',{status:503});
};
