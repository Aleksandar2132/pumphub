import { Wallet as AnchorWallet } from "@coral-xyz/anchor";
import { WalletContextState } from "@solana/wallet-adapter-react";

export function getAnchorWallet(wallet: WalletContextState): AnchorWallet | null {
  if (
    !wallet ||
    !wallet.publicKey ||
    !wallet.signTransaction ||
    !wallet.signAllTransactions
  ) {
    return null;
  }

  return {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  };
}
