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
    <button onClick={handleLaunch}>
      Launch Token 🚀
    </button>
  );
};

export default LaunchButton;
