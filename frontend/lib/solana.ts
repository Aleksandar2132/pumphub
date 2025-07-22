// frontend/lib/solana.ts

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

const PROGRAM_ID = new PublicKey('CKyBVMEvLvvAmek76UEq4gkQasdx78hdt2apCXCKtXiB');
const NETWORK = 'https://api.devnet.solana.com';
const COMMITMENT: Commitment = 'processed';
const opts = { preflightCommitment: COMMITMENT };

// Interfaz para Phantom Wallet
type PhantomAdapter = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
};

// Wallet personalizada para Anchor basada en Phantom
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
  // NO usar payer, lanzar error si se usa
  get payer(): Keypair {
    throw new Error('payer not supported');
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
  // Crear conexión
  const connection = new Connection(NETWORK, COMMITMENT);

  // Detectar wallet Phantom
  const solana = (window as any).solana;
  if (!solana?.isPhantom) throw new Error('Phantom wallet not found');
  await solana.connect();

  // Crear adapter Phantom
  const adapter: PhantomAdapter = {
    publicKey: solana.publicKey,
    signTransaction: solana.signTransaction.bind(solana),
    signAllTransactions: solana.signAllTransactions.bind(solana),
  };

  // Wallet compatible con Anchor
  const wallet = new AnchorWallet(adapter);

  // Crear provider Anchor correctamente
  const anchorProvider = new AnchorProvider(connection, wallet, opts);

  // Opcional: setear provider global para Anchor
  setProvider(anchorProvider);

  // CREAR PROGRAMA Anchor: aquí el 3er parámetro ES anchorProvider, sin casts raros
  const program = new Program(idl, PROGRAM_ID, anchorProvider);

  // Generar Keypair para mint
  const mintKP = Keypair.generate();

  // Obtener lamports para rent exemption
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  // Crear transacción para crear la cuenta mint
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
      9, // Decimales del token
      wallet.publicKey,
      null,
      TOKEN_PROGRAM_ID
    )
  );

  // Enviar transacción para crear mint
  await sendAndConfirmTransaction(connection, tx, [mintKP]);

  // Direcciones asociadas de token accounts
  const tokenAccount = await getAssociatedTokenAddress(mintKP.publicKey, wallet.publicKey);
  const feeReceiver = new PublicKey(walletAddress);
  const feeTokenAccount = await getAssociatedTokenAddress(mintKP.publicKey, feeReceiver);

  // Calcular cantidad tokens con decimales (9)
  const amount = new BN(tokenSupply).mul(new BN(10).pow(new BN(9)));

  // Llamar método RPC para lanzar token (según IDL)
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

  // Retornar dirección mint
  return mintKP.publicKey.toBase58();
};
