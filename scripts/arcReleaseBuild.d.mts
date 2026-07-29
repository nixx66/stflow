export function assertCleanStatus(status: string): void;
export function selectUnique<T>(candidates: T[], label: string): T;
export function standardInputFromBuild(input: {
  buildInfo: Record<string, any>;
  readCommitBlob: (path: string) => Promise<string>;
}): Promise<any>;
export function validateBuildProvenance(input: {
  artifact: Record<string, any>;
  buildInfo: Record<string, any>;
  readCommitBlob: (path: string) => Promise<string>;
  tracked: Set<string>;
}): Promise<void>;
export function buildCommit(input: {
  root: string;
  commit: string;
}): Promise<any>;
