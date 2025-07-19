import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import '@solana/wallet-adapter-react-ui/styles.css';
import { useMemo, useState } from 'react';
import * as anchor from '@coral-xyz/anchor';
import idl from './idl.json';

const programID = new anchor.web3.PublicKey("FfJxVq3U1hcoNFJVuYyfh1iG6zv7DJrM8pZJQtwM5mT4");

function LaunchToken() {
  const wallet = useWallet();
  const [message, setMessage] = useState('');

  const connection = useMemo(() => new anchor.web3.Connection("https://api.devnet.solana.com"), []);
  const provider = useMemo(() => new anchor.AnchorProvider(connection, wallet, {}), [connection, wallet]);
  const program = useMemo(() => new anchor.Program(idl, programID, provider), [idl, programID, provider]);

  const launch = async () => {
    if (!wallet.publicKey) {
      alert("Por favor conecta tu wallet primero");
      return;
    }
    try {
      const mint = anchor.web3.Keypair.generate();

      const associatedToken = await anchor.utils.token.associatedAddress({
        mint: mint.publicKey,
        owner: wallet.publicKey,
      });

      const feeReceiver = new anchor.web3.PublicKey("G2H9ZuNWtjmthZ2JJuLkHJ7yNVvRRhp8DhYxWjjN1J6x");

      const feeTokenAccount = await anchor.utils.token.associatedAddress({
        mint: mint.publicKey,
        owner: feeReceiver,
      });

      await program.methods
        .launchToken(9, new anchor.BN(1_000_000_000))
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
            connection,
            wallet.adapter,
            mint.publicKey,
            wallet.publicKey,
            wallet.publicKey,
            9
          ),
        ])
        .rpc();

      setMessage("✅ Token lanzado con éxito");
    } catch (err) {
      console.error(err);
      setMessage("❌ Error al lanzar token");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-10">
      <WalletMultiButton />
      <button
        onClick={launch}
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl"
      >
        Lanzar Token
      </button>
      <p>{message}</p>
    </div>
  );
}

export default function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <LaunchToken />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
