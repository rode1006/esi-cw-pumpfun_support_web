import { VersionedTransaction, Connection } from "@solana/web3.js";

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=0cbe06fe-486b-4f7d-823e-271385c48b1c";
const connection = new Connection(RPC_URL, "confirmed");

export const tradeToken = async (wallet, action, mint, amount, denominatedInSol, poolType) => {
  if (!wallet || !wallet.connected || !wallet.publicKey) {
    console.error("❌ Wallet not connected!");
    return;
  }

  try {
    // Step 1: Fetch Transaction from Pump.fun API
    const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        publicKey: wallet.publicKey.toBase58(), 
        action, // "buy" or "sell"
        mint, // Token address
        denominatedInSol: denominatedInSol ? "true" : "false", // "true" → SOL, "false" → tokens
        amount, // Amount of SOL or tokens
        slippage: 10, // Allowed slippage
        priorityFee: 0.00001, // Priority Fee
        pool: poolType.toLowerCase(), // Use Pump.fun bonding curve
      }),
    });

    if (response.status !== 200) {
      console.error("❌ API Error:", response.statusText);
      return;
    }

    // Step 2: Deserialize transaction data
    const data = await response.arrayBuffer();
    const transaction = VersionedTransaction.deserialize(new Uint8Array(data));

    // Step 3: Sign Transaction using Phantom Wallet
    const signedTransaction = await wallet.signTransaction(transaction);

    // Step 4: Send Transaction
    const signature = await connection.sendTransaction(signedTransaction);

    return signature; // Return transaction signature
  } catch (error) {
    console.error("❌ Trade Failed:", error);
  }
};
