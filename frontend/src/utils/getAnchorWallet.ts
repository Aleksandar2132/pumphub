import { WalletContextState } from "@solana/wallet-adapter-react";
import { Wallet } from "@coral-xyz/anchor";

export function getAnchorWallet(wallet: WalletContextState): Wallet | null {
  if (
    wallet &&
    wallet.publicKey &&
    wallet.signTransaction &&
    wallet.signAllTransactions
  ) {
    return {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    };
  }
  return null;
}
