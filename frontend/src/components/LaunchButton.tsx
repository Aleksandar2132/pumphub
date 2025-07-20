import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { launchToken } from "../launch";
import { getAnchorWallet } from "../utils/getAnchorWallet";

export function LaunchButton() {
  const wallet = useWallet();

  const handleLaunch = async () => {
    const anchorWallet = getAnchorWallet(wallet);
    if (!anchorWallet) {
      alert("Wallet no está conectada o lista");
      return;
    }

    // Nota: No es necesario crear 'provider' aquí, lo creas dentro de launchToken

    try {
      const tx = await launchToken(9, 1000, anchorWallet); // <-- PASAMOS anchorWallet aquí
      console.log("Token lanzado con tx:", tx);
    } catch (error) {
      console.error("Error lanzando token:", error);
    }
  };

  return <button onClick={handleLaunch}>Lanzar Token</button>;
}
