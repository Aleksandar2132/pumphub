import * as anchor from '@coral-xyz/anchor';
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
import idlJson from '../idl/pumpfun.json';

const idl = idlJson as anchor.Idl;

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
    throw new Error('payer not implemented');
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
  const provider = new anchor.AnchorProvider(connection, anchorWallet, opts);

  anchor.setProvider(provider);

  const program = new anchor.Program(idl, programID, provider);

  const mintKeypair = Keypair.generate();

  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: anchorWallet.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      9,
      anchorWallet.publicKey,
      null,
      TOKEN_PROGRAM_ID
    )
  );

  await sendAndConfirmTransaction(connection, tx, [mintKeypair]);

  const tokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    anchorWallet.publicKey
  );

  const feeReceiver = new PublicKey(walletAddress);
  const feeTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    feeReceiver
  );

  const amountBN = new anchor.BN(tokenSupply * 10 ** 9);

  await program.methods
    .launchToken(9, amountBN)
    .accounts({
      authority: anchorWallet.publicKey,
      mint: mintKeypair.publicKey,
      tokenAccount,
      feeTokenAccount,
      feeReceiver,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mintKeypair])
    .rpc();

  return mintKeypair.publicKey.toBase58();
};
