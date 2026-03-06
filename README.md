# Shadow Trader

A Solana copy-trade bot that monitors insider wallets via [Nansen](https://nansen.ai) API and automatically mirrors their trades through [Jupiter](https://jup.ag) aggregator.

## How It Works

1. Polls Nansen API for new transactions from watched wallets
2. Filters for buy/sell swaps
3. Executes the same trade via Jupiter using your configured SOL amount
4. Logs all activity to console

```
You → Nansen API (detect trade) → Jupiter API (build swap tx) → Sign locally → Solana RPC → On-chain
```

Your private key never leaves your machine — it only signs transactions locally.

## Setup

### Prerequisites

- Node.js 18+
- [Nansen API key](https://nansen.ai)
- A Solana wallet with SOL for trading

### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Default | Description |
|---|---|---|
| `NANSEN_API_KEY` | — | Your Nansen API key |
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana RPC endpoint |
| `WALLET_PRIVATE_KEY` | — | Base58 encoded private key |
| `WATCH_WALLETS` | — | Comma-separated wallet addresses to monitor |
| `MAX_SOL_PER_TRADE` | `0.1` | Max SOL to spend per copy trade |
| `SLIPPAGE_BPS` | `300` | Slippage tolerance (300 = 3%) |
| `COPY_SELLS` | `true` | Also copy sell trades |
| `POLL_INTERVAL_MS` | `10000` | Polling interval in milliseconds |

### Run

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Project Structure

```
src/
├── config.ts    # Environment variable loader
├── nansen.ts    # Nansen API client
├── jupiter.ts   # Jupiter DEX swap execution
└── index.ts     # Main polling loop
```

## Disclaimer

This software is for educational purposes only. Use at your own risk. Always do your own research before trading.
