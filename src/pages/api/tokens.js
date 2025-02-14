import { connectToDatabase } from "./lib/mongo"; 
import Token from "./models/Token"; 

export default async function handler(req, res) {
  await connectToDatabase(); // Ensure database connection

  if (req.method === "GET") {
    try {
      console.log("🔍 Fetching tokens...");
      const tokens = await Token.find({});
      console.log("✅ Tokens found:", tokens);
      return res.status(200).json(tokens);
    } catch (error) {
      console.error("❌ Error fetching tokens:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  if (req.method === "POST") {
    try {
      console.log("🔍 Adding token:", req.body)
      if (!req.body) {
        return res.status(400).json({ error: "Token address is required" });
      }

      // Save new token
      const newToken = new Token( req.body );
      console.log("🔍 Saving token:", newToken);
      await newToken.save();

      console.log("✅ Token added:", newToken);
      return res.status(201).json(newToken);
    } catch (error) {
      console.error("❌ Error adding token:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
