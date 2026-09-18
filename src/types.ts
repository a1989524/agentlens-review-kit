export type Digest = `sha256:${string}`;
export type DecisionStatus = 'authorized_for_trial' | 'rejected' | 'deferred';
export type ExecutionStatus = 'executed' | 'execution_failed' | 'execution_partial' | 'execution_noop';
export type EvaluationStatus = 'confirmed' | 'reverted' | 'inconclusive';
export interface Stamp { id: string; at: string; }
export interface HashedRecord extends Stamp { content_hash: Digest; }
export interface ReviewProposal extends HashedRecord {
  kind: 'review_proposal'; candidate_ref: string; version: number;
  reason: string; status: 'review_pending';
}
export interface ReviewDecision extends HashedRecord {
  kind: 'review_decision'; proposal_ref: string; proposal_hash: Digest;
  candidate_ref: string; candidate_version: number;
  decided_by: 'local_user'; status: DecisionStatus;
}
export interface ExecutionReceipt extends HashedRecord {
  kind: 'execution_receipt'; decision_ref: string; decision_hash: Digest;
  candidate_ref: string; status: ExecutionStatus; change_ref: string;
}
export interface EvaluationResult extends HashedRecord {
  kind: 'evaluation_result'; execution_ref: string; execution_hash: Digest;
  candidate_ref: string; status: EvaluationStatus;
  evidence_complete: boolean; checks_passed: boolean; regression_found: boolean;
}
