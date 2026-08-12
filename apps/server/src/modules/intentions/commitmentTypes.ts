export type CommitmentAction = "upsert" | "cancel";

export interface CommitmentOperation {
  action: CommitmentAction;
  topic: string;
  followUpAt?: string;
  expiresAt?: string;
}

export interface CommitmentPatch {
  operations: CommitmentOperation[];
}
