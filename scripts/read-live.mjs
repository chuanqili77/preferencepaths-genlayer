// Read-only: no accounts, signatures, deployments or writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createClient,abi} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';
const root=path.resolve(import.meta.dirname,'..');
const e=JSON.parse(fs.readFileSync(path.join(root,'evidence/studionet.json')));
const client=createClient({chain:studionet});assert.equal(Number(await client.getChainId()),61999);
const source=fs.readFileSync(path.join(root,'contracts/preference_paths.py'),'utf8');assert.equal(crypto.createHash('sha256').update(source).digest('hex'),e.sourceSha256);assert.equal(await client.getContractCode(e.address),source);
const r=JSON.parse(await client.readContract({address:e.address,functionName:'get_poll',args:[e.owner,'themes-demo'],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));assert.deepEqual(r,e.record);assert.equal(r.status,'TALLIED');
for(const [name,t] of Object.entries(e.transactions)){
 const tx=await client.getTransaction({hash:t.hash});
 assert.equal(tx.statusName,'FINALIZED');assert.equal(tx.resultName||tx.result_name,'MAJORITY_AGREE');assert.equal(tx.txExecutionResultName||tx.consensus_data?.leader_receipt?.find(x=>x.mode==='leader')?.execution_result,'SUCCESS');assert.equal(tx.leader_only,false);
 assert.equal(tx.from_address.toLowerCase(),t.signer.toLowerCase());assert.equal(tx.to_address.toLowerCase(),e.address.toLowerCase());
 if(t.method==='deploy')assert.equal(Buffer.from(tx.data.contract_code,'base64').toString(),source);
 else{const call=abi.calldata.decode(Buffer.from(tx.data.calldata.base64,'base64'));assert.equal(call.get('method'),t.method);assert.deepEqual(call.get('args'),t.args);}
 console.log(name,t.hash,'FINALIZED');
}
assert.deepEqual(r.tally.winners,[0]);assert.deepEqual(r.tally.direct,[[0,2,2],[1,0,3],[1,0,0]]);
console.log('VERIFIED: deployed source, exact receipt binding, full consensus and finalized state.');
