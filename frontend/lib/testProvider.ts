import { Connection, PublicKey, Commitment } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

type PhantomAdapter = {
  publicKey: PublicKey;
  signTransaction: any;
  signAllTransactions: any;
};

class AnchorWallet implements Wallet {
  constructor(private adapter: PhantomAdapter) {}
  get publicKey() {
    return this.adapter.publicKey;
  }
  signTransaction(tx: any) {
    return this.adapter.signTransaction(tx);
  }
  signAllTransactions(txs: any[]) {
    return this.adapter.signAllTransactions(txs);
  }
  get payer() {
    throw new Error('payer not supported');
  }
}

const NETWORK = 'https://api.devnet.solana.com';
const COMMITMENT: Commitment = 'processed';
const opts = { preflightCommitment: COMMITMENT };

async function testProvider() {
  const solana = (window as any).solana;

  if (!solana?.isPhantom) {
    console.error('Phantom wallet not found');
    return;
  }

  await solana.connect();

  console.log('Phantom connected:', solana.isConnected);
  console.log('Phantom publicKey:', solana.publicKey.toBase58());

  const adapter: PhantomAdapter = {
    publicKey: solana.publicKey,
    signTransaction: solana.signTransaction.bind(solana),
    signAllTransactions: solana.signAllTransactions.bind(solana),
  };

  const wallet = new AnchorWallet(adapter);

  console.log('wallet.publicKey:', wallet.publicKey.toBase58());

  const connection = new Connection(NETWORK, COMMITMENT);

  const provider = new AnchorProvider(connection, wallet, opts);

  console.log('provider.publicKey:', provider.publicKey.toBase58());
  console.log('provider.connection:', !!provider.connection);
}

testProvider().catch(console.error);
