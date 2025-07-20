import { WalletContextState } from "@solana/wallet-adapter-react";
import type { PublicKey, Transaction, TransactionSignature } from "@solana/web3.js";

export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}

export function getAnchorWallet(wallet: WalletContextState): AnchorWallet | null {
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
    };
  }
  return null;
}
