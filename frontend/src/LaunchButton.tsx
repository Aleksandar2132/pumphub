import React from "react";
import { launchToken } from "./launch"; // Asegúrate que la ruta sea correcta
import { phantomWalletAdapter } from "./phantomAdapter";

export default function LaunchButton() {
  const handleLaunch = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      alert("Por favor instala Phantom Wallet");
      return;
    }

    try {
      const tx = await launchToken(9, 1000, phantomWalletAdapter);
      alert("Token lanzado! Tx: " + tx);
    } catch (error) {
      alert("Error: " + error.message);
      console.error(error);
    }
  };

  return (
    <button onClick={handleLaunch}>
      Lanzar Token
    </button>
  );
}
