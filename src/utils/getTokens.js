import axios from "axios";
import { getTokenList } from "./axiosTokens";

const BASE_API_URL = "/api/getToken"; // Using our Next.js API proxy

export const getTokenData = async () => {
  try {
    const tokenAddresses = await getTokenList(); // Fetch token list

    const addresses = tokenAddresses
      .map((token) => token.address)
      .filter((address) => typeof address === "string" && address.trim() !== ""); // Remove undefined/null values

    console.log("✅ Valid token addresses:", addresses);

    if (addresses.length === 0) {
      console.warn("⚠️ No valid addresses found.");
      return [];
    }

    // Fetch data for all tokens via our proxy API
    const tokenDataPromises = addresses.map((address) =>
      axios.get(`${BASE_API_URL}?tokenAddress=${address}`)
    );

    const tokenDataResponses = await Promise.all(tokenDataPromises);
    const tokenDataList = tokenDataResponses.map((response) => response.data);

    return tokenDataList; // Return the data
  } catch (error) {
    console.error("❌ Error fetching token data:", error.message);
    return [];
  }
};
