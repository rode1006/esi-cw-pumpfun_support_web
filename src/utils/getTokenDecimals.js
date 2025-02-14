import { Connection, PublicKey } from "@solana/web3.js";

// Solana RPC Endpoint
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=0cbe06fe-486b-4f7d-823e-271385c48b1c";
const connection = new Connection(RPC_URL, "confirmed");

/**
 * Fetches the decimals for a given SPL token mint.
 * @param {string} tokenMintAddress - The mint address of the token.
 * @returns {Promise<number>} - The decimal places of the token.
 */
export const getTokenDecimals = async (tokenMintAddress) => {
  try {
    const mintPublicKey = new PublicKey(tokenMintAddress);
    
    // Fetch mint account info
    const accountInfo = await connection.getParsedAccountInfo(mintPublicKey);
    
    // Extract decimals from parsed account data
    const decimals = accountInfo?.value?.data?.parsed?.info?.decimals;

    if (decimals === undefined) {
      throw new Error("Decimals not found in mint account.");
    }

    return decimals;
  } catch (error) {
    console.error("Error fetching token decimals:", error);
    return 0; // Default to 0 if unable to fetch
  }
};
