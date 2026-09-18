import { createProposal, createReviewDecision, createExecutionReceipt, createEvaluationResult } from '../src/index.ts';

const at = (minute) => `2026-09-18T09:${String(minute).padStart(2,'0')}:00.000Z`;
const descriptions = {
  approved: {en:'Approved, executed, evaluated',zh:'允许试运行，执行完成，评价确认'},
  rejected: {en:'Rejected means no execution',zh:'拒绝提案，阻止执行'},
  failed: {en:'An execution can fail',zh:'执行失败，如实保留'},
  uncertain: {en:'Done is not yet proven',zh:'执行完成，证据仍然不足'}
};
export function buildScenarios() {
  return Object.entries(descriptions).map(([id,title]) => {
    const proposal = createProposal({id:`proposal-${id}`,at:at(0),candidate_ref:'workflow:creative-review',version:1,
      reason:'Try an explicit confirmation step before applying a suggested edit.'});
    const decision = createReviewDecision(proposal,{id:`decision-${id}`,at:at(1),decided_by:'local_user',
      status:id==='rejected'?'rejected':'authorized_for_trial'});
    const steps = [
      {record:proposal,title:{en:'A proposal is recorded',zh:'记录提案'},note:{en:'An idea is pending review. Nothing has been approved or executed.',zh:'提案等待审查。此时没有批准，也没有执行。'}},
      {record:decision,title:{en:'A separate human decision',zh:'独立的人工决定'},note:{en:id==='rejected'?'The reviewer rejects this trial.':'The reviewer permits a bounded trial, not a claim of success.',zh:id==='rejected'?'审查者拒绝本次试运行。':'审查者允许有限试运行，这不等于结果成功。'}}
    ];
    if (id==='rejected') {
      try { createExecutionReceipt(decision,{id:'forbidden-run',at:at(2),status:'executed',change_ref:'change:example'}); }
      catch (error) { steps.push({record:{kind:'blocked_attempt',code:error.message},title:{en:'Execution is blocked',zh:'执行被阻止'},note:{en:'The module refuses to create an execution receipt from a rejected decision.',zh:'模块拒绝根据已拒绝的决定创建执行记录。'}}); }
    } else {
      const execution = createExecutionReceipt(decision,{id:`execution-${id}`,at:at(2),status:id==='failed'?'execution_failed':'executed',change_ref:'change:synthetic-example'});
      const evaluation = createEvaluationResult(execution,{id:`evaluation-${id}`,at:at(3),candidate_ref:proposal.candidate_ref,
        evidence_complete:id==='approved',checks_passed:id==='approved',regression_found:false});
      steps.push({record:execution,title:{en:'Execution has its own result',zh:'执行拥有独立结果'},note:{en:id==='failed'?'A failure remains a failure; the decision is not rewritten.':'The execution receipt reports completion, without claiming product quality.',zh:id==='failed'?'如实保留执行失败，不改写之前的决定。':'执行记录说明操作已完成，不代表产品质量得到确认。'}});
      steps.push({record:evaluation,title:{en:'Evaluate the evidence',zh:'评价证据'},note:{en:id==='approved'?'All supplied example signals meet the confirmation rule.':'The evidence does not support confirmation. Keep the result inconclusive.',zh:id==='approved'?'示例中提供的信号满足确认规则。':'现有证据不足以确认，评价保留为不确定。'}});
    }
    return {id,title,synthetic:true,steps};
  });
}
