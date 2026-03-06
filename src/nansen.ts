import { config } from "./config.js";

const NANSEN_BASE_URL = "https://api.nansen.ai/v1";

export interface NansenTransaction {
  hash: string;
  blockTime: number;
  from: string;
  to: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  type: "buy" | "sell" | "transfer";
}

interface NansenApiResponse {
  transactions: NansenTransaction[];
}

export async function getWalletTransactions(
  walletAddress: string,
  since?: number
): Promise<NansenTransaction[]> {
  const params = new URLSearchParams({
    address: walletAddress,
    chain: "solana",
    limit: "20",
  });

  if (since) {
    params.set("since", since.toString());
  }

  const url = `${NANSEN_BASE_URL}/wallet/transactions?${params}`;

  const res = await fetch(url, {
    headers: {
      "x-api-key": config.nansenApiKey,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nansen API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as NansenApiResponse;
  return data.transactions ?? [];
}

export function filterSwaps(txs: NansenTransaction[], copySells: boolean): NansenTransaction[] {
  return txs.filter((tx) => {
    if (tx.type === "buy") return true;
    if (tx.type === "sell" && copySells) return true;
    return false;
  });
}
