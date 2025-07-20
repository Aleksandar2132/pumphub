import { PublicKey, Transaction } from "@solana/web3.js";

export const phantomWalletAdapter = {
  get publicKey() {
    return window.solana?.publicKey || null;
  },
  signTransaction: async (transaction: Transaction) => {
    if (!window.solana) throw new Error("Phantom no disponible");
    return window.solana.signTransaction(transaction);
  },
  signAllTransactions: async (transactions: Transaction[]) => {
    if (!window.solana) throw new Error("Phantom no disponible");
    return window.solana.signAllTransactions(transactions);
  },
};
