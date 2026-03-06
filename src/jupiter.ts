import {
  Connection,
  Keypair,
  VersionedTransaction,
} from "@solana/web3.js";
import { config } from "./config.js";

const JUPITER_API = "https://quote-api.jup.ag/v6";
const SOL_MINT = "So11111111111111111111111111111111111111112";

interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  routePlan: unknown[];
}

interface SwapResponse {
  swapTransaction: string;
}

export async function getQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number
): Promise<QuoteResponse> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountLamports.toString(),
    slippageBps: config.slippageBps.toString(),
  });

  const res = await fetch(`${JUPITER_API}/quote?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jupiter quote error ${res.status}: ${text}`);
  }
  return (await res.json()) as QuoteResponse;
}

export async function executeSwap(
  connection: Connection,
  wallet: Keypair,
  tokenMint: string,
  side: "buy" | "sell",
  solAmount: number
): Promise<string> {
  const lamports = Math.floor(solAmount * 1e9);

  const inputMint = side === "buy" ? SOL_MINT : tokenMint;
  const outputMint = side === "buy" ? tokenMint : SOL_MINT;
  const amount = side === "buy" ? lamports : lamports; // For sells, we'd need token balance — simplified here

  console.log(
    `  Getting quote: ${side.toUpperCase()} ${inputMint.slice(0, 8)}... -> ${outputMint.slice(0, 8)}...`
  );

  const quote = await getQuote(inputMint, outputMint, amount);

  const swapRes = await fetch(`${JUPITER_API}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
    }),
  });

  if (!swapRes.ok) {
    const text = await swapRes.text();
    throw new Error(`Jupiter swap error ${swapRes.status}: ${text}`);
  }

  const { swapTransaction } = (await swapRes.json()) as SwapResponse;

  const txBuf = Buffer.from(swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([wallet]);

  const rawTx = tx.serialize();
  const txId = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log(`  Tx sent: ${txId}`);

  const confirmation = await connection.confirmTransaction(txId, "confirmed");
  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  return txId;
}
