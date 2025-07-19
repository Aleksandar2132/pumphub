'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSupply, setTokenSupply] = useState('');

  const connectWallet = async () => {
    try {
      if (!window.solana) {
        throw new Error("Phantom Wallet no encontrada.");
      }
      const resp = await window.solana.connect();
      setWalletAddress(resp.publicKey.toString());
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  const createToken = async () => {
    if (!walletAddress || !tokenName || !tokenSymbol || !tokenSupply) return;

    try {
      const response = await fetch('/api/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenName, tokenSymbol, tokenSupply, walletAddress }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Token creado con éxito: ${data.tokenAddress}`);
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      console.error('Error creando token:', err);
    }
  };

  useEffect(() => {
    if (window.solana && window.solana.isPhantom) {
      window.solana.connect().then((resp: any) => {
        setWalletAddress(resp.publicKey.toString());
      });
    }
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-4">🚀 PumpFun Clone</h1>

      {walletAddress ? (
        <p className="mb-4">Conectado: {walletAddress}</p>
      ) : (
        <button
          onClick={connectWallet}
          className="mb-4 px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
        >
          Conectar Wallet Phantom
        </button>
      )}

      <div className="w-full max-w-md bg-gray-900 p-4 rounded-xl shadow-xl">
        <h2 className="text-xl font-semibold mb-2">Crear tu Memecoin</h2>

        <input
          type="text"
          placeholder="Nombre del token"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          className="w-full p-2 mb-2 rounded bg-gray-800 border border-gray-700"
        />

        <input
          type="text"
          placeholder="Símbolo (ej. PUMP)"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value)}
          className="w-full p-2 mb-2 rounded bg-gray-800 border border-gray-700"
        />

        <input
          type="number"
          placeholder="Supply Total"
          value={tokenSupply}
          onChange={(e) => setTokenSupply(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-gray-800 border border-gray-700"
        />

        <button
          onClick={createToken}
          className="w-full px-4 py-2 bg-green-600 rounded hover:bg-green-700"
        >
          🚀 Lanzar Memecoin
        </button>
      </div>
    </main>
  );
}
