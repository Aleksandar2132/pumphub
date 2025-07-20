import React from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { launchToken } from "../launch";

const LaunchButton = () => {
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();

  const handleLaunch = async () => {
    if (!anchorWallet) {
      alert("Conecta tu wallet primero");
      return;
    }

    const provider = new AnchorProvider(
      connection,
      anchorWallet,
      AnchorProvider.defaultOptions()
    );

    try {
      const tx = await launchToken(9, 1_000_000_000, provider);
      console.log("Token lanzado con tx:", tx);
      alert("Token lanzado: " + tx);
    } catch (err) {
      console.error("Error al lanzar token:", err);
      alert("Error: " + err);
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
