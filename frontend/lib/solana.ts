import { Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createInitializeMintInstruction, MINT_SIZE, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AnchorProvider, Program, Wallet, setProvider, BN, Idl, web3 } from '@coral-xyz/anchor';

import idlJson from '../idl/pumpfun.json';
const idl = idlJson as Idl;

const PROGRAM_ID = new PublicKey('CKyBVMEvLvvAmek76UEq4gkQasdx78hdt2apCXCKtXiB');
const NETWORK = 'https://api.devnet.solana.com';
const COMMITMENT = 'processed';
const opts = { preflightCommitment: COMMITMENT };

type PhantomAdapter = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction>(txs: T[]) => Promise<T[]>;
};

class AnchorWallet implements Wallet {
  constructor(private adapter: PhantomAdapter) {}
  get publicKey() {
    return this.adapter.publicKey;
  }
  signTransaction<T extends Transaction>(tx: T): Promise<T> {
    return this.adapter.signTransaction(tx);
  }
  signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]> {
    return this.adapter.signAllTransactions(txs);
  }
  get payer() {
    throw new Error('Payer not supported');
  }
}

export async function createTokenOnChain(walletAddress: string, tokenSupply: number) {
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
  const provider = new AnchorProvider(connection, wallet, opts);
  setProvider(provider);

  // Aquí provider es el AnchorProvider correcto
  const program = new Program(idl, PROGRAM_ID, provider);

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
  const amount = new BN(tokenSupply * 10 ** 9);

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
}
