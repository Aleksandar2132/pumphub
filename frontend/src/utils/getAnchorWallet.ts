import { WalletContextState } from "@solana/wallet-adapter-react";
import { NodeWallet } from "@coral-xyz/anchor";

export function getAnchorWallet(wallet: WalletContextState): NodeWallet | null {
  if (
    wallet?.wallet?.adapter &&
    wallet.publicKey &&
    wallet.signTransaction &&
    wallet.signAllTransactions
  ) {
    return {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    } as NodeWallet;
  }
  return null;
}
