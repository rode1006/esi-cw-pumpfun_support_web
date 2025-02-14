import axios from "axios";

export default async function handler(req, res) {
  const { tokenAddress } = req.query;
  
  if (!tokenAddress) {
    return res.status(400).json({ error: "Token address is required" });
  }

  const API_URL = `https://frontend-api-v3.pump.fun/coins/${tokenAddress}`;

  try {
    const response = await axios.get(API_URL);
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow frontend to access this API
    res.status(200).json(response.data);
  } catch (error) {
    console.error("❌ Proxy API Error:", error.message);
    res.status(error.response?.status || 500).json({ error: "Failed to fetch token data" });
  }
}
