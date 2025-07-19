interface Solana {
  isPhantom?: boolean;
  connect: () => Promise<any>;
  publicKey?: {
    toString: () => string;
  };
}

interface Window {
  solana?: Solana;
}
