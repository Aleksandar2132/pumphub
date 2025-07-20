import {
  AnchorProvider,
  BN,
  Program,
  Idl,
  Wallet,
  web3,
} from "@coral-xyz/anchor";
import rawIdl from "./idl/pumpfun.json";
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
  MINT_SIZE,
} from "@solana/spl-token";

const idl = rawIdl as unknown as Idl;

const programID = new PublicKey("FfJxVq3U1hcoNFJVuYyfh1iG6zv7DJrM8pZJQtwM5mT4");
const feeReceiver = new PublicKey("G2H9ZuNWtjmthZ2JJuLkHJ7yNVvRRhp8DhYxWjjN1J6x");

export async function launchToken(
  decimals: number,
  amount: number,
  wallet: Wallet
) {
  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new AnchorProvider(
    connection,
    wallet as any, // <-- aquí el cambio importante
    AnchorProvider.defaultOptions()
  );
  const program = new Program(idl, programID, provider);

  const mintKeypair = web3.Keypair.generate();
  const mint = mintKeypair.publicKey;

  const user = provider.wallet.publicKey;
  if (!user) throw new Error("Wallet no conectada");

  const tokenAccount = await getAssociatedTokenAddress(mint, user);
  const feeTokenAccount = await getAssociatedTokenAddress(mint, feeReceiver);

  const rent = await getMinimumBalanceForRentExemptMint(connection);

  const tx = await program.methods
    .launchToken(decimals, new BN(amount))
    .accounts({
      authority: user,
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
        fromPubkey: user,
        newAccountPubkey: mint,
        space: MINT_SIZE,
        lamports: rent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(mint, decimals, user, user),
      createAssociatedTokenAccountInstruction(user, tokenAccount, user, mint),
      createAssociatedTokenAccountInstruction(
        user,
        feeTokenAccount,
        feeReceiver,
        mint
      ),
    ])
    .signers([mintKeypair])
    .rpc();

  console.log("✅ Token lanzado con éxito, tx:", tx);
  return tx;
}
