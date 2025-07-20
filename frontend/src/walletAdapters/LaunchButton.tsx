import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { launchToken } from "../launch"; // ajusta ruta si es necesario
import { getAnchorWallet } from "../utils/getAnchorWallet";

export function LaunchButton() {
  const walletContext = useWallet();

  const handleLaunch = async () => {
    const anchorWallet = getAnchorWallet(walletContext);
    if (!anchorWallet) {
      alert("Conecta tu wallet primero");
      return;
    }
    const connection = new Connection("https://api.devnet.solana.com");
    const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());

    try {
      const tx = await launchToken(9, 1_000_000_000, provider);
      console.log("Token lanzado con transacción:", tx);
      alert("✅ Token lanzado: " + tx);
    } catch (err) {
      console.error("❌ Error lanzando token:", err);
      alert("Error lanzando token: " + (err as Error).message);
    }
  };

  return (
    <button onClick={handleLaunch}>
      Launch Token 🚀
    </button>
  );
};
