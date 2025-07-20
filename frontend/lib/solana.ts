import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import idl from './idl/pumpfun.json';  // <-- Asegúrate de que esta ruta sea correcta

const programID = new PublicKey('CKyBVMEvLvvAmek76UEq4gkQasdx78hdt2apCXCKtXiB');

const network = 'https://api.devnet.solana.com';
const opts = { preflightCommitment: 'processed' };

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
  const connection = new Connection(network, opts.preflightCommitment as any);

  // @ts-ignore
  const wallet = window?.solana;

  if (!wallet) {
    throw new Error('Wallet not found. Please install a Solana wallet like Phantom.');
  }

  const provider = new AnchorProvider(connection, wallet, opts);
  anchor.setProvider(provider);

  const program = new Program(idl as anchor.Idl, programID, provider);
  const mintKeypair = web3.Keypair.generate();

  const tokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    provider.wallet.publicKey
  );

  await program.methods
    .launchToken(9, new anchor.BN(tokenSupply))
    .accounts({
      authority: provider.wallet.publicKey,
      mint: mintKeypair.publicKey,
      tokenAccount: tokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mintKeypair])
    .rpc();

  return mintKeypair.publicKey.toBase58();
};
