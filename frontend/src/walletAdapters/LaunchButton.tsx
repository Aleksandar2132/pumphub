import { useWallet } from "@solana/wallet-adapter-react";
import { launchToken } from "./launch";
import { getAnchorWallet } from "./utils/getAnchorWallet";

const LaunchButton = () => {
  const wallet = useWallet();

  const handleLaunch = async () => {
    const anchorWallet = getAnchorWallet(wallet);
    if (!anchorWallet) {
      alert("Conecta tu wallet primero");
      return;
    }

    try {
      const tx = await launchToken(9, 1_000_000_000, anchorWallet);
      console.log("Transacción:", tx);
      alert("✅ Token lanzado: " + tx);
    } catch (err) {
      console.error("Error al lanzar token:", err);
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
