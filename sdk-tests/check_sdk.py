"""Real pinned SDK/storage with mocked LLM. Not network consensus."""
import json
from pathlib import Path
from gltest.direct import VMContext,deploy_contract
root=Path(__file__).resolve().parents[1];ex=json.loads((root/'examples/poll.json').read_text());members=['0x'+str(i)*40 for i in [1,2,3]]
labels=['FIRST']*6+['SECOND','SECOND','FIRST'];pairs=[(0,1),(0,2),(1,2)]
answer={'votes':[{'member':m,'first':i,'second':j,'choice':labels[k*3+z],'reason':'The signed ballot gives this complete preference ordering.'} for k,m in enumerate(members) for z,(i,j) in enumerate(pairs)]}
vm=VMContext();vm.sender=members[0];vm.mock_llm('^Interpret explicit',json.dumps(answer))
with vm.activate():
 c=deploy_contract(root/'contracts/preference_paths.py',vm,sdk_version='v0.3.0-rc7');c.open_poll('sdk',json.dumps(ex['options']),json.dumps(members))
 for m,s in zip(members,ex['ballots']):
  with vm.prank(m):c.submit_ballot(members[0],'sdk',s)
 r=json.loads(c.tally(members[0],'sdk'));assert r['status']=='TALLIED' and r['tally']['winners']==[0]
 assert vm.run_validator() is True
 vm.clear_mocks();answer['votes'][0]['choice']='TIE';vm.mock_llm('^Interpret explicit',json.dumps(answer));assert vm.run_validator() is False
print('PASS: SDK storage/calldata, signed member slots, independent validator accept/reject and terminal tally (mocked LLM).')
