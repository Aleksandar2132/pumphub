// pages/index.tsx
import dynamic from "next/dynamic";

const LaunchButton = dynamic(
  () => import("../frontend/src/wallet-adapters/LaunchButton"),
  { ssr: false }
);

export default function Home() {
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>PumpHub 🚀</h1>
      <p>Haz clic en el botón para lanzar tu token</p>
      <LaunchButton />
    </main>
  );
}
