import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@project-serum/anchor';
import { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '../../target/idl/pumpfun.json';

const programID = new PublicKey('YOUR_PROGRAM_ID_AQUI'); // Reemplaza aquí tu Program ID
const network = 'https://api.devnet.solana.com';
const opts = { preflightCommitment: 'processed' };

export const createTokenOnChain = async ({ tokenName, tokenSymbol, tokenSupply, walletAddress }: any) => {
  const connection = new Connection(network, opts.preflightCommitment as any);
  const wallet = window.solana;
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
