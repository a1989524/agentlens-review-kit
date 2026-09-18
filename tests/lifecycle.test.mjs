import test from 'node:test';
import assert from 'node:assert/strict';
import {createProposal,createReviewDecision,createExecutionReceipt,createEvaluationResult,verifyRecord,hashRecord} from '../src/index.ts';
import {buildScenarios} from '../examples/scenarios.mjs';
const stamp = {id:'p',at:'2026-09-18T09:00:00.000Z'};
const proposal = () => createProposal({...stamp,candidate_ref:'c',version:1,reason:'Review a bounded change'});
const decision = (status='authorized_for_trial') => createReviewDecision(proposal(),{...stamp,id:'d',decided_by:'local_user',status});
const execution = (status='executed') => createExecutionReceipt(decision(),{...stamp,id:'e',status,change_ref:'change:1'});
const evaluation = (ex=execution(),signals={}) => createEvaluationResult(ex,{...stamp,id:'v',candidate_ref:'c',evidence_complete:true,checks_passed:true,regression_found:false,...signals});
test('full chain keeps proposal, decision, execution and evaluation distinct',()=>{
  const records=[proposal(),decision(),execution(),evaluation()];
  assert.equal(new Set(records.map(x=>x.kind)).size,4);
  for(const record of records){verifyRecord(record);assert.ok(Object.isFrozen(record));}
  assert.equal(evaluation().status,'confirmed');
  assert.equal('execution_status' in decision(),false);
  assert.equal(execution().decision_hash,decision().content_hash);
});
for(const state of ['rejected','deferred']) test(`${state} cannot produce execution`,()=>{
  assert.throws(()=>createExecutionReceipt(decision(state),{...stamp,status:'executed',change_ref:'x'}),/TRIAL_NOT_AUTHORIZED/);
});
for(const state of ['execution_failed','execution_partial','execution_noop']) test(`${state} cannot be confirmed`,()=>assert.equal(evaluation(execution(state)).status,'inconclusive'));
test('missing evidence or failed checks remains inconclusive',()=>{
  assert.equal(evaluation(execution(),{evidence_complete:false}).status,'inconclusive');
  assert.equal(evaluation(execution(),{checks_passed:false}).status,'inconclusive');
});
test('regression takes precedence over successful signals',()=>assert.equal(evaluation(execution(),{regression_found:true}).status,'reverted'));
test('rejects invalid actor, statuses and versions at runtime',()=>{
  assert.throws(()=>createReviewDecision(proposal(),{...stamp,decided_by:'agent',status:'authorized_for_trial'}),/OWNER/);
  assert.throws(()=>createReviewDecision(proposal(),{...stamp,decided_by:'local_user',status:'done'}),/STATUS/);
  assert.throws(()=>createExecutionReceipt(decision(),{...stamp,status:'success',change_ref:'x'}),/STATUS/);
  assert.throws(()=>createProposal({...stamp,candidate_ref:'c',version:NaN,reason:'x'}),/VERSION/);
});
test('rejects inconsistent references and nonboolean evaluation inputs',()=>{
  assert.throws(()=>evaluation(execution(),{candidate_ref:'different'}),/CANDIDATE_MISMATCH/);
  assert.throws(()=>evaluation(execution(),{checks_passed:'yes'}),/SIGNAL/);
});
test('rejects changed records and wrong kinds',()=>{
  assert.throws(()=>createReviewDecision({...proposal(),reason:'altered'},{...stamp,decided_by:'local_user',status:'rejected'}),/INTEGRITY/);
  assert.throws(()=>createExecutionReceipt(proposal(),{...stamp,status:'executed',change_ref:'x'}),/KIND/);
});
test('canonical hashes ignore key insertion order, not values',()=>{
  assert.equal(hashRecord({a:1,b:2}),hashRecord({b:2,a:1}));
  assert.notEqual(hashRecord({a:1}),hashRecord({a:2}));
  assert.throws(()=>hashRecord({a:undefined}),/UNSUPPORTED/);
  assert.throws(()=>hashRecord({a:Infinity}),/UNSUPPORTED/);
});
test('timestamps are real UTC dates and cannot precede parents',()=>{
  assert.throws(()=>createProposal({...stamp,at:'2026-02-30T09:00:00.000Z',candidate_ref:'c',version:1,reason:'x'}),/TIMESTAMP/);
  assert.throws(()=>createReviewDecision(proposal(),{...stamp,at:'2026-09-17T09:00:00.000Z',decided_by:'local_user',status:'rejected'}),/TIME_ORDER/);
});
test('examples are deterministic and rejection includes an actual blocked call',()=>{
  const scenarios=buildScenarios();assert.deepEqual(scenarios,buildScenarios());
  assert.equal(scenarios.length,4);
  assert.equal(scenarios[1].steps.at(-1).record.code,'TRIAL_NOT_AUTHORIZED');
  assert.equal(scenarios[2].steps.at(-1).record.status,'inconclusive');
});
