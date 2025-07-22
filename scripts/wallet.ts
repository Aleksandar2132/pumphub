import {
  PublicKey,
  Transaction,
  VersionedTransaction,
  Keypair,
} from '@solana/web3.js';

import { Wallet } from '@coral-xyz/anchor';

const dummyKeypair = Keypair.generate();

export class AnchorWallet implements Wallet {
  constructor(private adapter: {
    publicKey: PublicKey;
    signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
    signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
  }) {}

  get publicKey(): PublicKey {
    return this.adapter.publicKey;
  }

  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.adapter.signTransaction(tx);
  }

  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return this.adapter.signAllTransactions(txs);
  }

  // Este campo no es parte de la interfaz Wallet pero lo pones si lo necesitas en tu código
  get payer(): Keypair {
    return dummyKeypair;
  }
}

// Helper para crear la instancia desde la ventana (Phantom wallet)
export function createAnchorWalletFromPhantom() {
  const solana = (window as any).solana;
  if (!solana?.isPhantom) throw new Error('Phantom wallet not found');

  const adapter = {
    publicKey: solana.publicKey as PublicKey,
    signTransaction: solana.signTransaction.bind(solana),
    signAllTransactions: solana.signAllTransactions.bind(solana),
  };

  return new AnchorWallet(adapter);
}
