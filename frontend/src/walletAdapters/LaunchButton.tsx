import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { launchToken } from "../launch";
import { getAnchorWallet } from "../utils/getAnchorWallet"; // Asegúrate de que este archivo existe

const LaunchButton = () => {
  const wallet = useWallet();

  const handleLaunch = async () => {
    const anchorWallet = getAnchorWallet(wallet);
    if (!anchorWallet) {
      alert("Conecta tu wallet primero");
      return;
    }

    // ✅ Aquí se crea correctamente el AnchorProvider
    const connection = new Connection("https://api.devnet.solana.com");
    const provider = new AnchorProvider(
      connection,
      anchorWallet,
      AnchorProvider.defaultOptions()
    );

    try {
      // ✅ Aquí se pasa el provider como se espera
      const tx = await launchToken(9, 1_000_000_000, provider);
      console.log("✅ Token lanzado con tx:", tx);
      alert("✅ Token lanzado: " + tx);
    } catch (err) {
      console.error("❌ Error al lanzar token:", err);
      alert("❌ Error: " + err);
    }
  };

  return (
    <button
      onClick={handleLaunch}
      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl mt-4"
    >
      Launch Token 🚀
    </button>
  );
};

export default LaunchButton;
