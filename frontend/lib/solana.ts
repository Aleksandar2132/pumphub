import {
  Connection,
  PublicKey,
  SystemProgram,
  Commitment,
  Keypair,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  MINT_SIZE,
} from '@solana/spl-token';
import {
  AnchorProvider,
  Program,
  Wallet,
  setProvider,
  BN,
  Idl,
  web3,
} from '@coral-xyz/anchor';

import idlJson from '../idl/pumpfun.json';
const idl = idlJson as Idl;

const PROGRAM_ID = new PublicKey('CKyBVMEvLvvAmek76UEq4gkQasdx78hdt2apCXCKtXiB');
const NETWORK = 'https://api.devnet.solana.com';
const COMMITMENT: Commitment = 'processed';
const opts = { preflightCommitment: COMMITMENT };

type PhantomAdapter = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(t: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(t: T[]) => Promise<T[]>;
};

class AnchorWallet implements Wallet {
  constructor(private adapter: PhantomAdapter) {}
  get publicKey() {
    return this.adapter.publicKey;
  }
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.adapter.signTransaction(tx);
  }
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return this.adapter.signAllTransactions(txs);
  }
  get payer(): Keypair {
    throw new Error('No se usa payer');
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
  const conn = new Connection(NETWORK, COMMITMENT);
  const solana: any = typeof window !== 'undefined' ? (window as any).solana : null;
  if (!solana?.isPhantom) throw new Error('Phantom no encontrado');
  await solana.connect();

  const adapter: PhantomAdapter = {
    publicKey: new PublicKey(solana.publicKey.toString()),
    signTransaction: solana.signTransaction.bind(solana),
    signAllTransactions: solana.signAllTransactions.bind(solana),
  };

  const wallet = new AnchorWallet(adapter);
  const provider = new AnchorProvider(conn, wallet, opts);
  setProvider(provider);

  const program = new Program<typeof idl>(idl, PROGRAM_ID, provider);

  const mintKP = Keypair.generate();
  const lam = await conn.getMinimumBalanceForRentExemption(MINT_SIZE);

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintKP.publicKey,
      space: MINT_SIZE,
      lamports: lam,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKP.publicKey,
      9,
      wallet.publicKey,
      null,
      TOKEN_PROGRAM_ID
    )
  );
  await sendAndConfirmTransaction(conn, tx, [mintKP]);

  const tokenAccount = await getAssociatedTokenAddress(mintKP.publicKey, wallet.publicKey);
  const feeReceiver = new PublicKey(walletAddress);
  const feeTokenAccount = await getAssociatedTokenAddress(mintKP.publicKey, feeReceiver);
  const amt = new BN(tokenSupply * 10 ** 9);

  await program.methods
    .launchToken(9, amt)
    .accounts({
      authority: wallet.publicKey,
      mint: mintKP.publicKey,
      tokenAccount,
      feeTokenAccount,
      feeReceiver,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mintKP])
    .rpc();

  return mintKP.publicKey.toBase58();
};
