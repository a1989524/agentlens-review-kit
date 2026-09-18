import { seal, verifyRecord } from './hash.ts';
import type { Stamp, ReviewProposal, ReviewDecision, ExecutionReceipt, EvaluationResult, DecisionStatus, ExecutionStatus } from './types.ts';

function text(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000 || /[\u0000-\u0008]/u.test(value)) throw new TypeError(`${name}_INVALID`);
}
function stamp(value: Stamp): void {
  if (!value || typeof value !== 'object') throw new TypeError('STAMP_REQUIRED');
  text(value.id, 'ID'); text(value.at, 'TIMESTAMP');
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.at) || !Number.isFinite(Date.parse(value.at)) || new Date(value.at).toISOString() !== value.at) throw new TypeError('TIMESTAMP_INVALID');
}
function parent(value: unknown, kind: string): asserts value is Record<string, unknown> {
  verifyRecord(value);
  if (value.kind !== kind) throw new Error('RECORD_KIND_MISMATCH');
  text(value.id, 'PARENT_ID'); text(value.candidate_ref, 'CANDIDATE');
}
function chronological(at: string, parentAt: string): void {
  if (!Number.isFinite(Date.parse(parentAt)) || Date.parse(at) < Date.parse(parentAt)) throw new Error('TIME_ORDER_INVALID');
}
export function createProposal(input: Stamp & {candidate_ref: string; version: number; reason: string}): ReviewProposal {
  stamp(input); text(input.candidate_ref, 'CANDIDATE'); text(input.reason, 'REASON');
  if (!Number.isSafeInteger(input.version) || input.version < 1) throw new TypeError('VERSION_INVALID');
  return seal({kind: 'review_proposal' as const, id: input.id, at: input.at, candidate_ref: input.candidate_ref,
    version: input.version, reason: input.reason, status: 'review_pending' as const});
}
export function createReviewDecision(proposal: ReviewProposal, input: Stamp & {decided_by: 'local_user'; status: DecisionStatus}): ReviewDecision {
  parent(proposal, 'review_proposal'); stamp(input); chronological(input.at, proposal.at);
  if (proposal.status !== 'review_pending') throw new Error('PROPOSAL_NOT_PENDING');
  if (!Number.isSafeInteger(proposal.version) || proposal.version < 1) throw new Error('VERSION_INVALID');
  if (input.decided_by !== 'local_user') throw new Error('DECISION_OWNER_INVALID');
  if (!['authorized_for_trial','rejected','deferred'].includes(input.status)) throw new Error('DECISION_STATUS_INVALID');
  return seal({kind: 'review_decision' as const, id: input.id, at: input.at, proposal_ref: proposal.id,
    proposal_hash: proposal.content_hash, candidate_ref: proposal.candidate_ref, candidate_version: proposal.version,
    decided_by: input.decided_by, status: input.status});
}
export function createExecutionReceipt(decision: ReviewDecision, input: Stamp & {status: ExecutionStatus; change_ref: string}): ExecutionReceipt {
  parent(decision, 'review_decision'); stamp(input); chronological(input.at, decision.at); text(input.change_ref, 'CHANGE_REF');
  if (decision.decided_by !== 'local_user') throw new Error('DECISION_OWNER_INVALID');
  if (decision.status !== 'authorized_for_trial') throw new Error('TRIAL_NOT_AUTHORIZED');
  if (!['executed','execution_failed','execution_partial','execution_noop'].includes(input.status)) throw new Error('EXECUTION_STATUS_INVALID');
  return seal({kind: 'execution_receipt' as const, id: input.id, at: input.at, decision_ref: decision.id,
    decision_hash: decision.content_hash, candidate_ref: decision.candidate_ref, status: input.status, change_ref: input.change_ref});
}
export function createEvaluationResult(execution: ExecutionReceipt, input: Stamp & {
  candidate_ref: string; evidence_complete: boolean; checks_passed: boolean; regression_found: boolean;
}): EvaluationResult {
  parent(execution, 'execution_receipt'); stamp(input); chronological(input.at, execution.at);
  if (!['executed','execution_failed','execution_partial','execution_noop'].includes(execution.status)) throw new Error('EXECUTION_STATUS_INVALID');
  if (input.candidate_ref !== execution.candidate_ref) throw new Error('EVALUATION_CANDIDATE_MISMATCH');
  for (const key of ['evidence_complete','checks_passed','regression_found'] as const) {
    if (typeof input[key] !== 'boolean') throw new TypeError('EVALUATION_SIGNAL_INVALID');
  }
  const status = input.regression_found ? 'reverted' : execution.status === 'executed' && input.evidence_complete && input.checks_passed ? 'confirmed' : 'inconclusive';
  return seal({kind: 'evaluation_result' as const, id: input.id, at: input.at, execution_ref: execution.id,
    execution_hash: execution.content_hash, candidate_ref: execution.candidate_ref, status,
    evidence_complete: input.evidence_complete, checks_passed: input.checks_passed, regression_found: input.regression_found});
}
