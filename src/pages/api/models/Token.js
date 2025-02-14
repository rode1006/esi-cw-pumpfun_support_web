import mongoose from "mongoose";

const TokenSchema = new mongoose.Schema({
  address: { type: String, required: true },
});

// Prevent model re-compilation issues in Next.js
const Token = mongoose.models.Token || mongoose.model("Token", TokenSchema);

export default Token;
