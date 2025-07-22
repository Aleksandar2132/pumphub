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
  BN,
  Idl,
  web3,
} from '@coral-xyz/anchor';

import idlJson from '../idl/pumpfun.json';
const idl = idlJson as Idl;

const programID = new PublicKey('CKyBVMEvLvvAmek76UEq4gkQasdx78hdt2apCXCKtXiB');
const network = 'https://api.devnet.solana.com';
const commitment: Commitment = 'processed';
const opts = { preflightCommitment: commitment };

// Phantom Wallet Adapter type
type PhantomWalletAdapter = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
};

// Anchor Wallet implementing Wallet interface
class AnchorWallet implements Wallet {
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
    throw new Error('payer is not implemented');
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
  // Create connection
  const connection = new Connection(network, commitment);

  // Detect Phantom wallet
  const solana = typeof window !== 'undefined' ? (window as any).solana : null;
  if (!solana?.isPhantom) throw new Error('Phantom wallet not found');

  // Connect wallet
  await solana.connect();

  // Create adapter from Phantom wallet
  const adapter: PhantomWalletAdapter = {
    publicKey: new PublicKey(solana.publicKey.toString()),
    signTransaction: solana.signTransaction.bind(solana),
    signAllTransactions: solana.signAllTransactions.bind(solana),
  };

  // Create Anchor wallet wrapper
  const anchorWallet = new AnchorWallet(adapter);

  // Create Anchor provider
  const provider = new AnchorProvider(connection, anchorWallet, opts);

  // Create Program instance with the correct provider
  const program = new Program(idl, programID, provider);

  // Generate mint account
  const mintKeypair = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  // Create and initialize mint account transaction
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
      9, // decimals
      anchorWallet.publicKey,
      null,
      TOKEN_PROGRAM_ID
    )
  );

  await sendAndConfirmTransaction(connection, tx, [mintKeypair]);

  // Get associated token accounts for payer and fee receiver
  const tokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    anchorWallet.publicKey
  );

  const feeReceiver = new PublicKey(walletAddress);
  const feeTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    feeReceiver
  );

  // Convert supply to BN with decimals
  const amountBN = new BN(tokenSupply * 10 ** 9);

  // Call on-chain program method
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
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mintKeypair])
    .rpc();

  return mintKeypair.publicKey.toBase58();
};
