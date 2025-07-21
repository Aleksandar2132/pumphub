import * as anchor from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Commitment,
  Keypair,
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

  class PhantomWalletWrapper implements anchor.Wallet {
    public publicKey: PublicKey;
    constructor(public wallet: any) {
      this.publicKey = wallet.publicKey;
    }
    async signTransaction(tx: anchor.web3.Transaction): Promise<anchor.web3.Transaction> {
      return this.wallet.signTransaction(tx);
    }
    async signAllTransactions(txs: anchor.web3.Transaction[]): Promise<anchor.web3.Transaction[]> {
      return this.wallet.signAllTransactions(txs);
    }
  }

  const wallet = new PhantomWalletWrapper(solana);
  const provider = new anchor.AnchorProvider(connection, wallet, opts);
  anchor.setProvider(provider);

  const program = new anchor.Program(idl as anchor.Idl, programID, provider);

  const mintKeypair = Keypair.generate();

  const tokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    provider.wallet.publicKey
  );

  await program.methods
    .launchToken(9, new anchor.BN(tokenSupply))
    .accounts({
      authority: provider.wallet.publicKey,
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
