import {
  Connection,
  PublicKey,
  SystemProgram,
  Keypair,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
  Commitment,
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
const NETWORK = 'https://api.devnet.solana.com';
const COMMITMENT: Commitment = 'processed';
const opts = { preflightCommitment: COMMITMENT };

// Interfaz para Phantom Wallet
type PhantomAdapter = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
};

// ✅ Creamos un payer fijo
const dummyPayer = Keypair.generate();

// Clase adaptadora para usar Phantom como Wallet de Anchor
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
    // ✅ Ahora siempre devuelve el mismo keypair dummy
    return dummyPayer;
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
}): Promise<string> => {
  const connection = new Connection(NETWORK, COMMITMENT);
  const solana = (window as any).solana;

  if (!solana?.isPhantom) throw new Error('Phantom wallet not found');
  await solana.connect();

  const adapter: PhantomAdapter = {
    publicKey: solana.publicKey,
    signTransaction: solana.signTransaction.bind(solana),
    signAllTransactions: solana.signAllTransactions.bind(solana),
  };

  const wallet = new AnchorWallet(adapter);
  const anchorProvider = new AnchorProvider(connection, wallet, opts);
  setProvider(anchorProvider);

  const program = new Program(idl, anchorProvider);

  const mintKP = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintKP.publicKey,
      space: MINT_SIZE,
      lamports,
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

  await sendAndConfirmTransaction(connection, tx, [mintKP]);

  const tokenAccount = await getAssociatedTokenAddress(mintKP.publicKey, wallet.publicKey);
  const feeReceiver = new PublicKey(walletAddress);
  const feeTokenAccount = await getAssociatedTokenAddress(mintKP.publicKey, feeReceiver);

  const amount = new BN(tokenSupply).mul(new BN(10).pow(new BN(9)));

  await program.methods
    .launchToken(9, amount)
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
