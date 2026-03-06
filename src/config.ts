import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  nansenApiKey: required("NANSEN_API_KEY"),
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  walletPrivateKey: required("WALLET_PRIVATE_KEY"),
  watchWallets: required("WATCH_WALLETS").split(",").map((w) => w.trim()),
  maxSolPerTrade: parseFloat(process.env.MAX_SOL_PER_TRADE || "0.1"),
  slippageBps: parseInt(process.env.SLIPPAGE_BPS || "300", 10),
  copySells: process.env.COPY_SELLS === "true",
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "10000", 10),
};
