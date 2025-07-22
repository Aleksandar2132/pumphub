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

// Implementación Wallet para Anchor basada en Phantom
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
  // Conexión
  const connection = new Connection(NETWORK, COMMITMENT);
  const solana = (window as any).solana;

  if (!solana?.isPhantom) throw new Error('Phantom wallet not found');
  await solana.connect();

  // Adapter Phantom
  const adapter: PhantomAdapter = {
    publicKey: solana.publicKey,
    signTransaction: solana.signTransaction.bind(solana),
    signAllTransactions: solana.signAllTransactions.bind(solana),
  };

  // Wallet para Anchor
  const wallet = new AnchorWallet(adapter);

  // Provider Anchor con la conexión y wallet correctos
  const anchorProvider = new AnchorProvider(connection, wallet, opts);

  // Setear provider globalmente (opcional)
  setProvider(anchorProvider);

  // Crear instancia del programa Anchor con el provider correcto
  const program = new Program(idl, PROGRAM_ID, anchorProvider);

  // Generar nueva cuenta mint para el token
  const mintKP = Keypair.generate();

  // Obtener el mínimo balance necesario para rent exemption
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  // Crear transacción para crear la cuenta mint e inicializar el token mint
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
      9, // Decimales
      wallet.publicKey,
      null,
      TOKEN_PROGRAM_ID
    )
  );

  // Enviar transacción para crear la mint
  await sendAndConfirmTransaction(connection, tx, [mintKP]);

  // Obtener direcciones asociadas para token accounts
  const tokenAccount = await getAssociatedTokenAddress(mintKP.publicKey, wallet.publicKey);
  const feeReceiver = new PublicKey(walletAddress);
  const feeTokenAccount = await getAssociatedTokenAddress(mintKP.publicKey, feeReceiver);

  // Calcular cantidad de tokens en base a decimales (9)
  const amount = new BN(tokenSupply).mul(new BN(10).pow(new BN(9)));

  // Llamar método RPC de Anchor para lanzar token (según tu IDL)
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

  // Retornar la dirección pública (base58) de la mint creada
  return mintKP.publicKey.toBase58();
};
