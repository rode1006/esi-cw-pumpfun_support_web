import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://cryptogame131:xasUTA1D1gQ44n1U@cluster0.dbbfz.mongodb.net/pumpfun?retryWrites=true&w=majority&appName=Cluster0";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

// Global cache to prevent re-connection issues in Next.js
let cached = global.mongoose || { conn: null, promise: null };

export async function connectToDatabase() {
  if (cached.conn) {
    console.log("✅ Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("🔄 Connecting to MongoDB...");
    cached.promise = mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then((mongoose) => {
      console.log("✅ Connected to MongoDB");
      return mongoose;
    }).catch((err) => {
      console.error("❌ MongoDB connection error:", err);
      throw new Error("Failed to connect to database");
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Assign cache globally to avoid re-connections in Next.js hot reload
global.mongoose = cached;
