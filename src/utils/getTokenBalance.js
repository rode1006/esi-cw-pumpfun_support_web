import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { getTokenDecimals } from "./getTokenDecimals";

// Solana RPC Endpoint
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=0cbe06fe-486b-4f7d-823e-271385c48b1c";
const connection = new Connection(RPC_URL, "confirmed");

/**
 * Fetches the token balance of a specific SPL token in the connected wallet.
 * @param {PublicKey} walletAddress - The wallet's public key.
 * @param {string} tokenMintAddress - The mint address of the token.
 * @returns {Promise<number>} - The token balance.
 */
export const getTokenBalance = async (walletAddress, tokenMintAddress) => {

    try {
        const mintPublicKey = new PublicKey(tokenMintAddress);
        const walletPublicKey = new PublicKey(walletAddress);
        
        // Get the associated token account (ATA) for the token
        const tokenAccountAddress = await getAssociatedTokenAddress(mintPublicKey, walletPublicKey);
        
        // Fetch token account data
        const tokenAccount = await getAccount(connection, tokenAccountAddress);

        const tokenDecimal = await getTokenDecimals(tokenMintAddress);
        
        // Convert balance to human-readable format (taking decimals into account)
        return Number(tokenAccount.amount) / 10 ** tokenDecimal;
    } catch (error) {
        console.error("Error fetching token balance:", error);
        return 0; // Return 0 if no balance found or error occurs
    }
};