import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";

const dummyKeypair = Keypair.generate();

const wallet = {
  publicKey: dummyKeypair.publicKey,
  signTransaction: async (tx: Transaction | VersionedTransaction) => {
    tx.partialSign(dummyKeypair);
    return tx;
  },
  signAllTransactions: async (txs: (Transaction | VersionedTransaction)[]) => {
    txs.forEach(tx => tx.partialSign(dummyKeypair));
    return txs;
  }
};

export default wallet;
