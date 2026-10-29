"""Mocked host/model tests of the deployable file; not network consensus."""
import importlib.util,itertools,json,sys,types,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];A='0x'+'1'*40;B='0x'+'2'*40;C='0x'+'3'*40;D='0x'+'4'*40
class Return:
 def __init__(self,x):self.calldata=x
class Public:
 write=staticmethod(lambda f:f);view=staticmethod(lambda f:f)
gl=types.SimpleNamespace(Contract=object,public=Public(),message=types.SimpleNamespace(sender_address=A),vm=types.SimpleNamespace(Return=Return,UserError=ValueError),nondet=types.SimpleNamespace())
sys.modules['genlayer']=types.SimpleNamespace(gl=gl,TreeMap=dict)
spec=importlib.util.spec_from_file_location('p',ROOT/'contracts/preference_paths.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
EX=json.loads((ROOT/'examples/poll.json').read_text());MEMBERS=[A,B,C]
def rows(labels=None):
 labels=labels or ['FIRST']*6+['SECOND','SECOND','FIRST']
 return {'votes':[{'member':m,'first':i,'second':j,'choice':labels[k*3+z],'reason':'The signed statement explicitly gives this strict preference.'} for k,m in enumerate(MEMBERS) for z,(i,j) in enumerate(p.pairs(3))]}
class Tests(unittest.TestCase):
 def setUp(self):
  gl.message.sender_address=A;self.c=p.PreferencePaths();self.answer=rows();self.second=None;self.calls=0
  def llm(*a,**kw):self.calls+=1;return self.second if self.calls>1 and self.second is not None else self.answer
  gl.nondet.exec_prompt=llm
  def run(l,v):
   x=l()
   if not v(Return(x)):raise ValueError('DISAGREE')
   return x
  gl.vm.run_nondet_unsafe=run
 def ready(self):
  self.c.open_poll('themes',json.dumps(EX['options']),json.dumps(MEMBERS))
  for m,s in zip(MEMBERS,EX['ballots']):gl.message.sender_address=m;self.c.submit_ballot(A,'themes',s)
 def test_real_source_lifecycle(self):
  self.ready();r=json.loads(self.c.tally(A,'themes'));self.assertEqual(r['status'],'TALLIED');self.assertEqual(r['tally']['winners'],[0])
 def test_duplicate_ballot(self):
  self.ready()
  with self.assertRaisesRegex(ValueError,'BALLOT_LOCKED'):self.c.submit_ballot(A,'themes',EX['ballots'][2])
 def test_nonmember(self):
  self.c.open_poll('themes',json.dumps(EX['options']),json.dumps(MEMBERS));gl.message.sender_address=D
  with self.assertRaisesRegex(ValueError,'NOT_MEMBER'):self.c.submit_ballot(A,'themes',EX['ballots'][0])
 def test_all_members_required(self):
  self.c.open_poll('themes',json.dumps(EX['options']),json.dumps(MEMBERS))
  with self.assertRaisesRegex(ValueError,'NOT_READY'):self.c.tally(A,'themes')
 def test_independent_disagreement(self):
  self.ready();self.second=rows(['TIE']*9)
  with self.assertRaisesRegex(ValueError,'DISAGREE'):self.c.tally(A,'themes')
  self.assertEqual(json.loads(self.c.get_poll(A,'themes'))['status'],'READY')
 def test_unclear_blocks_whole_tally(self):
  self.ready();self.answer=rows(['UNCLEAR']+['FIRST']*8);r=json.loads(self.c.tally(A,'themes'));self.assertEqual(r['status'],'REVIEW');self.assertEqual(r['tally'],{})
 def test_ties_keep_all_winners(self):self.assertEqual(p.schulze(3,rows(['TIE']*9)['votes'])['winners'],[0,1,2])
 def test_cycle_no_arbitrary_tiebreak(self):
  # A>B>C>A, one win per edge, yields a three-way strongest-path tie.
  vote=[{'first':0,'second':1,'choice':'FIRST'},{'first':0,'second':2,'choice':'SECOND'},{'first':1,'second':2,'choice':'FIRST'}]
  self.assertEqual(p.schulze(3,vote)['winners'],[0,1,2])
 def test_terminal_tally(self):
  self.ready();self.c.tally(A,'themes')
  with self.assertRaisesRegex(ValueError,'NOT_READY'):self.c.tally(A,'themes')
 def test_source_binding(self):
  b=[{'member':m,'text':s} for m,s in zip(MEMBERS,EX['ballots'])];r=rows();r['votes'][0]['source']='forged'
  with self.assertRaisesRegex(ValueError,'ALTERED_SOURCE'):p.interpretation(r,b,3)
 def test_omitted_and_reordered_pairs(self):
  b=[{'member':m,'text':s} for m,s in zip(MEMBERS,EX['ballots'])]
  for r in [{'votes':rows()['votes'][:-1]},{'votes':list(reversed(rows()['votes']))}]:
   with self.assertRaises(ValueError):p.interpretation(r,b,3)
 def test_all_small_strength_graphs_against_simple_path_oracle(self):
  edges=[(i,j) for i in range(3) for j in range(3) if i!=j]
  for weights in itertools.product(range(3),repeat=6):
   direct=[[0]*3 for _ in range(3)];votes=[]
   for (i,j),w in zip(edges,weights):
    direct[i][j]=w
    votes += [{'first':min(i,j),'second':max(i,j),'choice':'FIRST' if i<j else 'SECOND'}]*w
   graph=[[direct[i][j] if direct[i][j]>direct[j][i] else 0 for j in range(3)] for i in range(3)]
   expected=[[0]*3 for _ in range(3)]
   for i,j in edges:
    alternatives=[graph[i][j]]+[min(graph[i][k],graph[k][j]) for k in range(3) if k not in (i,j)]
    expected[i][j]=max(alternatives)
   actual=p.schulze(3,votes);self.assertEqual(actual['strongest_paths'],expected)
   self.assertEqual(actual['winners'],[i for i in range(3) if all(i==j or expected[i][j]>=expected[j][i] for j in range(3))])
if __name__=='__main__':unittest.main()
