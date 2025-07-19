import { AnchorProvider, BN, Wallet, web3, Idl, Program } from "@coral-xyz/anchor";
import rawIdl from "./idl/pumpfun.json";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
  MINT_SIZE,
} from "@solana/spl-token";

// 👇 Cast correcto del IDL
const idl = rawIdl as unknown as Idl;

// 👇 Constantes necesarias
const programID = new PublicKey("FfJxVq3U1hcoNFJVuYyfh1iG6zv7DJrM8pZJQtwM5mT4");
const feeReceiver = new PublicKey("G2H9ZuNWtjmthZ2JJuLkHJ7yNVvRRhp8DhYxWjjN1J6x");

export async function launchToken(wallet: Wallet, decimals: number, amount: number) {
  if (!wallet.publicKey) throw new Error("Wallet no conectada");

  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());

  // 👇 ESTA ES LA LÍNEA CRUCIAL (usa el orden correcto y evita el error)
  const program = new Program(idl as Idl, programID, provider);

  const mintKeypair = web3.Keypair.generate();
  const mint = mintKeypair.publicKey;

  const tokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey);
  const feeTokenAccount = await getAssociatedTokenAddress(mint, feeReceiver);

  const rent = await getMinimumBalanceForRentExemptMint(connection);

  const tx = await program.methods
    .launchToken(decimals, new BN(amount))
    .accounts({
      authority: wallet.publicKey,
      mint,
      tokenAccount,
      feeTokenAccount,
      feeReceiver,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .preInstructions([
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mint,
        space: MINT_SIZE,
        lamports: rent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(mint, decimals, wallet.publicKey, wallet.publicKey),
      createAssociatedTokenAccountInstruction(wallet.publicKey, tokenAccount, wallet.publicKey, mint),
      createAssociatedTokenAccountInstruction(wallet.publicKey, feeTokenAccount, feeReceiver, mint),
    ])
    .signers([mintKeypair])
    .rpc();

  console.log("Token lanzado con éxito, tx:", tx);
  return tx;
}
