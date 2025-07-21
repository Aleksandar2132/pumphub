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
import idlJson from '../idl/pumpfun.json'; // Ajusta la ruta si hace falta

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
    throw new Error('payer not implemented in browser context');
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
  const myAnchorProvider = new anchor.AnchorProvider(connection, anchorWallet, opts);

  anchor.setProvider(myAnchorProvider);

  const program = new anchor.Program(idl, programID, myAnchorProvider);

  const mintKeypair = Keypair.generate();

  // Crear cuenta mint con rent exención y inicializarla
  const lamports = await connection.getMinimumBalanceForRentExemption(
    anchor.web3.MintLayout.span
  );

  const tx = new anchor.web3.Transaction();

  tx.add(
    SystemProgram.createAccount({
      fromPubkey: myAnchorProvider.wallet.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: anchor.web3.MintLayout.span,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    anchor.web3.Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mintKeypair.publicKey,
      9, // decimals
      myAnchorProvider.wallet.publicKey,
      null
    )
  );

  await myAnchorProvider.sendAndConfirm(tx, [mintKeypair]);

  // Obtener cuentas asociadas para token y feeReceiver
  const tokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    myAnchorProvider.wallet.publicKey
  );

  const feeReceiverPubkey = new PublicKey(walletAddress);

  const feeTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    feeReceiverPubkey
  );

  // Multiplicar tokenSupply por 10^9 para ajustar decimales
  const supplyBN = new anchor.BN(tokenSupply * 10 ** 9);

  // Llamar al método launchToken
  await program.methods
    .launchToken(9, supplyBN)
    .accounts({
      authority: myAnchorProvider.wallet.publicKey,
      mint: mintKeypair.publicKey,
      tokenAccount,
      feeTokenAccount,
      feeReceiver: feeReceiverPubkey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mintKeypair])
    .rpc();

  return mintKeypair.publicKey.toBase58();
};
