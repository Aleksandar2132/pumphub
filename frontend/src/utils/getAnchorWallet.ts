import {
  WalletContextState,
} from "@solana/wallet-adapter-react";
import {
  AnchorWallet,
} from "@coral-xyz/anchor";

/**
 * Convierte el contexto de wallet en un AnchorWallet
 */
export function getAnchorWallet(wallet: WalletContextState): AnchorWallet | null {
  if (
    wallet &&
    wallet.publicKey &&
    wallet.signAllTransactions &&
    wallet.signTransaction
  ) {
    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    };
  }

  return null;
}
