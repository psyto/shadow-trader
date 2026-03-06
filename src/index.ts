import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "./config.js";
import { getWalletTransactions, filterSwaps, type NansenTransaction } from "./nansen.js";
import { executeSwap } from "./jupiter.js";

const connection = new Connection(config.solanaRpcUrl, "confirmed");
const wallet = Keypair.fromSecretKey(bs58.decode(config.walletPrivateKey));

// Track processed transactions to avoid duplicates
const processedTxs = new Set<string>();

function log(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function copyTrade(tx: NansenTransaction) {
  const side = tx.type as "buy" | "sell";
  log(
    `Copying ${side.toUpperCase()} from ${tx.from.slice(0, 8)}... | Token: ${tx.tokenSymbol} (${tx.tokenAddress.slice(0, 8)}...) | Amount: ${config.maxSolPerTrade} SOL`
  );

  try {
    const txId = await executeSwap(
      connection,
      wallet,
      tx.tokenAddress,
      side,
      config.maxSolPerTrade
    );
    log(`SUCCESS ${side.toUpperCase()} ${tx.tokenSymbol} | Tx: ${txId}`);
  } catch (err) {
    log(`FAILED ${side.toUpperCase()} ${tx.tokenSymbol} | Error: ${err}`);
  }
}

async function pollWallet(walletAddress: string, lastSeen: Map<string, number>) {
  const since = lastSeen.get(walletAddress);

  try {
    const txs = await getWalletTransactions(walletAddress, since);
    const swaps = filterSwaps(txs, config.copySells);

    for (const tx of swaps) {
      if (processedTxs.has(tx.hash)) continue;
      processedTxs.add(tx.hash);

      await copyTrade(tx);
    }

    if (txs.length > 0) {
      const latest = Math.max(...txs.map((t) => t.blockTime));
      lastSeen.set(walletAddress, latest);
    }
  } catch (err) {
    log(`Error polling ${walletAddress.slice(0, 8)}...: ${err}`);
  }
}

async function main() {
  log("=== Shadow Trader Started ===");
  log(`Watching ${config.watchWallets.length} wallet(s)`);
  log(`Max SOL per trade: ${config.maxSolPerTrade}`);
  log(`Slippage: ${config.slippageBps} bps`);
  log(`Copy sells: ${config.copySells}`);
  log(`Poll interval: ${config.pollIntervalMs}ms`);
  log(`Bot wallet: ${wallet.publicKey.toBase58()}`);
  log("");

  const lastSeen = new Map<string, number>();

  // Set initial timestamp to now so we only copy future trades
  const now = Math.floor(Date.now() / 1000);
  for (const addr of config.watchWallets) {
    lastSeen.set(addr, now);
    log(`Monitoring: ${addr}`);
  }

  log("");
  log("Listening for trades...");

  // Poll loop
  while (true) {
    for (const addr of config.watchWallets) {
      await pollWallet(addr, lastSeen);
    }
    await new Promise((r) => setTimeout(r, config.pollIntervalMs));
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
