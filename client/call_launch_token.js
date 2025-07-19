const anchor = require("@coral-xyz/anchor");
const { Connection, clusterApiUrl, PublicKey } = require("@solana/web3.js");

(async () => {
  // 1. Configuración de conexión y provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet;

  // 2. ID del programa (el mismo de lib.rs)
  const programId = new PublicKey("FfJxVq3U1hcoNFJVuYyfh1iG6zv7DJrM8pZJQtwM5mT4");

  // 3. Cargar IDL (copiada automáticamente al compilar)
  const idl = await anchor.Program.fetchIdl(programId, provider);

  // 4. Crear instancia del programa
  const program = new anchor.Program(idl, programId, provider);

  // 5. Generar nueva cuenta de mint
  const mint = anchor.web3.Keypair.generate();

  // 6. Derivar cuentas asociadas
  const associatedToken = await anchor.utils.token.associatedAddress({
    mint: mint.publicKey,
    owner: wallet.publicKey,
  });

  const feeReceiver = new PublicKey("G2H9ZuNWtjmthZ2JJuLkHJ7yNVvRRhp8DhYxWjjN1J6x");

  const feeTokenAccount = await anchor.utils.token.associatedAddress({
    mint: mint.publicKey,
    owner: feeReceiver,
  });

  // 7. Llamar a launch_token
  console.log("Enviando transacción...");
  await program.methods
    .launchToken(9, new anchor.BN(1_000_000_000)) // 1 token con 9 decimales
    .accounts({
      authority: wallet.publicKey,
      mint: mint.publicKey,
      tokenAccount: associatedToken,
      feeTokenAccount,
      feeReceiver,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    })
    .signers([mint])
    .preInstructions([
      await anchor.utils.token.createMintInstruction(
        provider.connection,
        wallet.payer,
        mint.publicKey,
        wallet.publicKey,
        wallet.publicKey,
        9
      ),
    ])
    .rpc();

  console.log("✅ ¡Token lanzado con éxito!");
})();
