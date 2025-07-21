import * as anchor from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Commitment,
  Keypair,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import idl from '../idl/pumpfun.json';

const programID = new PublicKey('CKyBVMEvLvvAmek76UEq4gkQasdx78hdt2apCXCKtXiB');
const network = 'https://api.devnet.solana.com';
const commitment: Commitment = 'processed';
const opts = { preflightCommitment: commitment };

type PhantomWalletAdapter = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
};

class AnchorWallet implements anchor.Wallet {
  constructor(private adapter: PhantomWalletAdapter) {}

  get publicKey(): PublicKey {
    return this.adapter.publicKey;
  }

  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.adapter.signTransaction(tx);
  }

  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return this.adapter.signAllTransactions(txs);
  }

  get payer(): Keypair {
    throw new Error('payer not implemented in browser context');
  }
}

export const createTokenOnChain = async ({
  tokenName,
  tokenSymbol,
  tokenSupply,
  walletAddress,
}: {
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: number;
  walletAddress: string;
}) => {
  const connection = new Connection(network, commitment);
  const solana = typeof window !== 'undefined' ? (window as any).solana : null;

  if (!solana?.isPhantom) throw new Error('Phantom wallet not found');

  await solana.connect();

  const adapter: PhantomWalletAdapter = {
    publicKey: new PublicKey(solana.publicKey.toString()),
    signTransaction: solana.signTransaction.bind(solana),
    signAllTransactions: solana.signAllTransactions.bind(solana),
  };

  const anchorWallet = new AnchorWallet(adapter);
  const myAnchorProvider = new anchor.AnchorProvider(connection, anchorWallet, opts);

  // Para depurar:
  console.log('myAnchorProvider:', myAnchorProvider);
  console.log('myAnchorProvider.connection:', myAnchorProvider.connection);
  console.log('myAnchorProvider.wallet:', myAnchorProvider.wallet);

  anchor.setProvider(myAnchorProvider);

  const anchorWallet = new AnchorWallet(adapter);
const myAnchorProvider = new anchor.AnchorProvider(connection, anchorWallet, opts);

anchor.setProvider(myAnchorProvider);

const program = new anchor.Program(idl as anchor.Idl, programID, myAnchorProvider);


  const mintKeypair = Keypair.generate();

  const tokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    myAnchorProvider.wallet.publicKey
  );

  await program.methods
    .launchToken(9, new anchor.BN(tokenSupply))
    .accounts({
      authority: myAnchorProvider.wallet.publicKey,
      mint: mintKeypair.publicKey,
      tokenAccount,
      feeTokenAccount: tokenAccount,
      feeReceiver: new PublicKey(walletAddress),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mintKeypair])
    .rpc();

  return mintKeypair.publicKey.toBase58();
};
