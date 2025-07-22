import {
  Connection,
  PublicKey,
  SystemProgram,
  Keypair,
  Transaction,
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
  setProvider,
  BN,
  Idl,
  web3,
} from '@coral-xyz/anchor';

import { AnchorWallet } from './wallet'; // ✔️ Asegúrate de que wallet.ts esté en la misma carpeta

import idlJson from '../idl/pumpfun.json'; // ✔️ Ajusta si tu ruta es distinta

const idl = idlJson as Idl;
const NETWORK = 'https://api.devnet.solana.com';
const COMMITMENT: Commitment = 'processed';
const opts = { preflightCommitment: COMMITMENT };

async function main() {
  const connection = new Connection(NETWORK, COMMITMENT);
  const solana = (window as any).solana;

  if (!solana?.isPhantom) throw new Error('Phantom wallet not found');
  await solana.connect();

  const adapter = {
    publicKey: solana.publicKey,
    signTransaction: solana.signTransaction.bind(solana),
    signAllTransactions: solana.signAllTransactions.bind(solana),
  };

  const wallet = new AnchorWallet(adapter);
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
      9, // Decimales del token
      wallet.publicKey,
      null,
      TOKEN_PROGRAM_ID
    )
  );

  await sendAndConfirmTransaction(connection, tx, [mintKP]);

  const tokenAccount = await getAssociatedTokenAddress(
    mintKP.publicKey,
    wallet.publicKey
  );

  const feeReceiver = new PublicKey('TU_DIRECCION_DE_WALLET'); // 🧠 Cambia esto por tu wallet
  const feeTokenAccount = await getAssociatedTokenAddress(
    mintKP.publicKey,
    feeReceiver
  );

  const amount = new BN(1_000_000).mul(new BN(10).pow(new BN(9))); // 🧠 Supply fijo: 1 millón con 9 decimales

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

main().catch((err) => {
  console.error(err);
});
