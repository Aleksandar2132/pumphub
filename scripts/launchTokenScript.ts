import {
  Connection,
  PublicKey,
  SystemProgram,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  Commitment,
  VersionedTransaction,
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
  setProvider,
  BN,
  Idl,
  web3,
} from '@coral-xyz/anchor';

import { AnchorWallet } from './wallet'; // wallet.ts en la misma carpeta

import idlJson from '../frontend/idl/pumpfun.json'; // Ajusta según tu estructura

const idl = idlJson as Idl;
const NETWORK = 'https://api.devnet.solana.com';
const COMMITMENT: Commitment = 'processed';
const opts = { preflightCommitment: COMMITMENT };

type TxType = Transaction | VersionedTransaction;

export async function launchTokenScript(
  walletAdapter: {
    publicKey: PublicKey;
    signTransaction: <T extends TxType>(tx: T) => Promise<T>;
    signAllTransactions: <T extends TxType>(txs: T[]) => Promise<T[]>;
  },
  feeReceiverAddress: string,
  tokenSupply: number
) {
  const connection = new Connection(NETWORK, COMMITMENT);

  if (!walletAdapter?.publicKey) throw new Error('Wallet adapter no válido');

  const wallet = new AnchorWallet(walletAdapter);
  const provider = new AnchorProvider(connection, wallet, opts);
  setProvider(provider);

  const program = new Program(idl, provider);

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
      9, // decimales del token
      wallet.publicKey,
      null,
      TOKEN_PROGRAM_ID
    )
  );

  await sendAndConfirmTransaction(connection, tx, [mintKP]);

  const tokenAccount = await getAssociatedTokenAddress(mintKP.publicKey, wallet.publicKey);

  const feeReceiver = new PublicKey(feeReceiverAddress);
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

  console.log('Token creado:', mintKP.publicKey.toBase58());
}
