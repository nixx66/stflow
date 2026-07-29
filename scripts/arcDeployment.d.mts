export const ARC_CHAIN_ID: number;
export const ARC_RPC_URL: string;
export const ARC_EXPLORER_URL: string;
export const ARC_USDC: `0x${string}`;

type Artifact = {
  abi: Array<Record<string, unknown>>;
  bytecode: { object: string };
  deployedBytecode: {
    object: string;
    immutableReferences?: Record<string, Array<{ start: number; length: number }>>;
  };
  metadata: {
    compiler: { version: string };
    language?: string;
    sources?: Record<string, unknown>;
    settings: Record<string, any>;
  };
};

type Rpc = (method: string, params: unknown[]) => Promise<any>;

export function materializeRuntimeBytecode(
  bytecode: string,
  references: Record<string, Array<{ start: number; length: number }>> | undefined,
  immutableAddress: string,
): `0x${string}`;

export function buildDeploymentRequest(input: {
  artifact: Artifact;
  buildInfo: Record<string, any>;
  commit: string;
}): any;

export function buildStandardJsonInput(input: {
  artifact: Artifact;
  readSource: (path: string) => Promise<string>;
}): Promise<any>;

export function validateDeployment(input: {
  address: string;
  tx: string;
  artifact: Artifact;
  commit: string;
  rpc: Rpc;
}): Promise<any>;

export function saveDeploymentRecord(input: {
  record: unknown;
  output: string;
  write: boolean;
}): Promise<boolean>;
