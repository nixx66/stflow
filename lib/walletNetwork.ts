import { ARC_TESTNET } from "./arc.ts";

type SwitchChain = (chainId: number) => Promise<unknown>;

export async function switchToArcTestnet(switchChain: SwitchChain) {
  await switchChain(ARC_TESTNET.chainId);
}

export function getNetworkSwitchError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 4001
  ) {
    return "Network switch was cancelled in your wallet.";
  }

  return "Unable to switch to Arc Testnet. Check MetaMask and try again.";
}
