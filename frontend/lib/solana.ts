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

type BrowserWallet = {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions: (txs: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
};

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

  const wallet: BrowserWallet = {
    publicKey: new PublicKey(solana.publicKey.toString()),
    signTransaction: async (tx) => await solana.signTransaction(tx),
    signAllTransactions: async (txs) => await solana.signAllTransactions(txs),
  };

  // Aquí se crea correctamente el AnchorProvider
  const anchorProvider = new anchor.AnchorProvider(connection, wallet as any, opts);

  // Este console.log te ayuda a verificar que no sea un PublicKey
  console.log('anchorProvider:', anchorProvider);

  // Ya con AnchorProvider correcto, creamos el programa
  const program = new anchor.Program(idl as anchor.Idl, programID, anchorProvider);

  const mintKeypair = Keypair.generate();

  const tokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    wallet.publicKey
  );

  await program.methods
    .launchToken(9, new anchor.BN(tokenSupply))
    .accounts({
      authority: wallet.publicKey,
      mint: mintKeypair.publicKey,
      tokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mintKeypair])
    .rpc();

  return mintKeypair.publicKey.toBase58();
};
