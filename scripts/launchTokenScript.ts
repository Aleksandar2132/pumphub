import { Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { launchToken } from "../frontend/src/launch"; // ajusta la ruta
import wallet from "./wallet"; // tu wallet que implemente los métodos necesarios

async function main() {
  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  const tx = await launchToken(9, 1000, provider);
  console.log("Token lanzado con tx:", tx);
}

main().catch(console.error);
