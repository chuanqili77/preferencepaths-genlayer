// Opt-in zero-value development writes. Existing intents and hashes are resumed, never resent.
const STATE_NAME='.preferencepaths-studionet.json',ACCOUNT_COUNT=3,SOURCE_FILE='contracts/preference_paths.py',READ_METHOD='get_poll',EXAMPLE_ID='themes-demo';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createClient,abi} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
const root=path.resolve(import.meta.dirname,'..');
const json=x=>JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v,2);
const file=process.env.VERIFY_STATE||path.join(os.homedir(),STATE_NAME);
let state;
if(fs.existsSync(file))state=JSON.parse(fs.readFileSync(file));
else{if(process.env.NEW_TEST!=='1')throw Error('Set NEW_TEST=1 once for an isolated zero-value run.');state={keys:Array.from({length:ACCOUNT_COUNT},()=>generatePrivateKey()),txs:{}};fs.writeFileSync(file,json(state),{mode:0o600});}
const save=()=>fs.writeFileSync(file,json(state),{mode:0o600});
const accounts=state.keys.map(privateKeyToAccount),clients=accounts.map(account=>createClient({chain:studionet,account}));
const client=clients[0],owner=accounts[0].address;
assert.equal(Number(await client.getChainId()),61999);
const source=fs.readFileSync(path.join(root,SOURCE_FILE),'utf8'),sha=crypto.createHash('sha256').update(source).digest('hex');
if(state.sourceSha256)assert.equal(state.sourceSha256,sha,'Source changed; inspect old run.');state.sourceSha256=sha;save();
async function send(label,actor,method,args){
 let t=state.txs[label];
 if(!t){t=state.txs[label]={signer:accounts[actor].address,method,args,intent:true};save();
 t.hash=method==='deploy'?await clients[actor].deployContract({code:source,args:[],leaderOnly:false}):await clients[actor].writeContract({address:state.address,functionName:method,args,value:0n,leaderOnly:false});save();console.log(label,'submitted',t.hash);}
 if(!t.hash)throw Error('Unresolved send intent '+label);
 assert.equal(t.signer,accounts[actor].address);assert.equal(t.method,method);assert.deepEqual(t.args,args);
 for(let i=0;i<180;i++){
  if(t.receipt?.statusName==='FINALIZED')break;
  t.receipt=await client.getTransaction({hash:t.hash});t.receipt.resultName??=t.receipt.result_name;t.receipt.txExecutionResultName??=t.receipt.consensus_data?.leader_receipt?.find(x=>x.mode==='leader')?.execution_result;save();
  if(['UNDETERMINED','CANCELED'].includes(t.receipt.statusName))throw Error(label+' terminal failure; inspect, never blindly resend');
  if(t.receipt.statusName!=='FINALIZED')await new Promise(r=>setTimeout(r,2000));
 }
 const r=t.receipt;assert.equal(r.statusName,'FINALIZED','Resume existing hash');assert.equal(r.resultName,'MAJORITY_AGREE');assert.equal(r.txExecutionResultName,'SUCCESS');assert.equal(r.leader_only,false);assert.equal(r.from_address.toLowerCase(),t.signer.toLowerCase());
 if(method==='deploy'){state.address=r.to_address;save();assert.equal(Buffer.from(r.data.contract_code,'base64').toString(),source);}
 else{assert.equal(r.to_address.toLowerCase(),state.address.toLowerCase());const call=abi.calldata.decode(Buffer.from(r.data.calldata.base64,'base64'));assert.equal(call.get('method'),method);assert.deepEqual(call.get('args'),args);}
 console.log(label,'FINALIZED / MAJORITY_AGREE / SUCCESS');
}
const read=async()=>JSON.parse(await client.readContract({address:state.address,functionName:READ_METHOD,args:[owner,EXAMPLE_ID],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
function project(r){return {hash:r.hash,statusName:r.statusName,resultName:r.resultName,txExecutionResultName:r.txExecutionResultName,from_address:r.from_address,to_address:r.to_address,leader_only:r.leader_only,data:{...r.data,calldata:{base64:r.data?.calldata?.base64}},consensus_data:{votes:r.consensus_data?.votes,leader_receipt:r.consensus_data?.leader_receipt?.map(l=>({mode:l.mode,execution_result:l.execution_result,result:{status:l.result?.status,payload:typeof l.result?.payload==='object'?{readable:l.result.payload?.readable}:l.result?.payload}}))}};}
function finish(record,note){const evidence={network:{chainId:61999,rpc:'https://studio.genlayer.com/api'},address:state.address,owner,sourceSha256:sha,note,transactions:Object.fromEntries(Object.entries(state.txs).map(([n,t])=>[n,{hash:t.hash,signer:t.signer,method:t.method,args:t.args,receipt:project(t.receipt)}])),record};fs.writeFileSync(path.join(root,'evidence/studionet.json'),json(evidence)+'\n');console.log('VERIFIED',state.address,record.status);}

await send('deploy',0,'deploy',[]);assert.equal(await client.getContractCode(state.address),source);
const ex=JSON.parse(fs.readFileSync(path.join(root,'examples/poll.json')));
await send('open',0,'open_poll',[EXAMPLE_ID,JSON.stringify(ex.options),JSON.stringify(accounts.map(a=>a.address))]);
for(let i=0;i<3;i++)await send('ballot_'+i,i,'submit_ballot',[owner,EXAMPLE_ID,ex.ballots[i]]);
await send('tally',0,'tally',[owner,EXAMPLE_ID]);
const record=await read();assert.equal(record.status,'TALLIED');assert.deepEqual(record.tally.winners,[0]);
assert.deepEqual(record.tally.direct,[[0,2,2],[1,0,3],[1,0,0]]);
finish(record,'Synthetic editor-theme preferences; all three test wallets controlled by one operator. Public receipt projections omit node configuration, timing logs and redundant byte arrays.');
