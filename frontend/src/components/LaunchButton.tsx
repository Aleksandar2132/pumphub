import React from "react";
import { useWallet } from "@solana/wallet-adapter-react"; // o el wallet que uses
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { launchToken } from "../launch"; // importa la función de launchToken

export default function LaunchButton() {
  const wallet = useWallet();

  async function handleLaunch() {
    if (!wallet.connected) {
      alert("Conecta tu wallet primero");
      return;
    }

    const connection = new Connection("https://api.devnet.solana.com");
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());

    try {
      const tx = await launchToken(9, 1000, provider);
      alert(`Token lanzado! Tx: ${tx}`);
    } catch (error) {
      console.error(error);
      alert("Error lanzando token");
    }
  }

  return (
    <button onClick={handleLaunch} disabled={!wallet.connected}>
      Lanzar Token
    </button>
  );
}
