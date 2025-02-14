import { getTokenDecimals } from "@/utils/getTokenDecimals";
import { Connection, PublicKey } from "@solana/web3.js";
import axios from "axios";

const BASE_API_URL = "/api/getToken";

/**
 * Fetches token information using a single token address.
 * @param {string} tokenAddress - The address of the token.
 * @returns {Promise<Object|null>} - Token data or null if not found.
 */

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=0cbe06fe-486b-4f7d-823e-271385c48b1c"; 
const connection = new Connection(RPC_URL, "confirmed");

export const getTokenInfoByAddress = async (tokenAddress) => {
  if (!tokenAddress) {
    console.error("Invalid token address");
    return null;
  }

  try {
    const response = await axios.get(`${BASE_API_URL}?tokenAddress=${tokenAddress}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching token data for ${tokenAddress}:`, error);
    return null; // Return null if the request fails
  }
};

export const getRealTokenReserves = async (bondingCurveAddress) => {
  try {
      const tokenAccountInfo = await connection.getParsedAccountInfo(new PublicKey(bondingCurveAddress));

      if (!tokenAccountInfo || !tokenAccountInfo.value) {
          console.error("Token account not found:", bondingCurveAddress);
          return 0;
      }

      const balance = tokenAccountInfo.value.data?.parsed?.info?.tokenAmount?.amount || 0;
      return parseFloat(balance);
  } catch (error) {
      console.error("Error fetching real token reserves:", error);
      return 0;
  }
};

export const calculateVirtualLiquidity = async (tokenInfo) => {
  if (!tokenInfo || !tokenInfo.virtual_sol_reserves || !tokenInfo.virtual_token_reserves) {
    console.error("Missing token reserve data or decimals");
    return 0;
  }

  const tokenDecimal = await getTokenDecimals(tokenInfo?.mint);

  const virtualSolReserves = Number(tokenInfo.virtual_sol_reserves) / 10 ** tokenDecimal;
  const virtualTokenReserves = Number(tokenInfo.virtual_token_reserves) / 10 ** tokenDecimal;

  if (virtualSolReserves <= 0 || virtualTokenReserves <= 0) {
    return 0; // Avoid invalid calculations
  }

  const virtualLiquidity = 2 * Math.sqrt(virtualSolReserves * virtualTokenReserves);

  return virtualLiquidity.toFixed(2); // Returns liquidity rounded to 2 decimals
};