import { VersionedTransaction, Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { addToken } from "./axiosTokens";

export const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=0cbe06fe-486b-4f7d-823e-271385c48b1c";
const connection = new Connection(RPC_URL, "confirmed");

export const sendLocalCreateTx = async ({ wallet, file, name, symbol, description, twitter, telegram, website, amount }) => {
    try {
        if (!wallet || !wallet.publicKey) {
            throw new Error("Wallet not connected");
        }

        // // Generate a random keypair for the mint address
        const mintKeypair = Keypair.generate();

        // Define token metadata
        const formData = new FormData();
        formData.append("file", file); // Image file uploaded from the frontend
        formData.append("name", name);
        formData.append("symbol", symbol);
        formData.append("description", description);
        formData.append("twitter", twitter || '');
        formData.append("telegram", telegram || '');
        formData.append("website", website || '');
        formData.append("showName", "true");

        // Create IPFS metadata storage
        const metadataResponse = await fetch("/api/createToken", {
            method: "POST",
            body: formData
        });

        if (!metadataResponse.ok) {
            throw new Error("Failed to upload metadata to IPFS");
        }

        const metadataResponseJSON = await metadataResponse.json();

        // Request transaction creation
        const response = await fetch("https://pumpportal.fun/api/trade-local", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                publicKey: wallet.publicKey.toBase58(),
                action: "create",
                tokenMetadata: {
                    name: name,
                    symbol: symbol,
                    uri: metadataResponseJSON.metadataUri,
                },
                mint: mintKeypair.publicKey.toBase58(),
                denominatedInSol: "true",
                amount: amount,
                slippage: 30,
                priorityFee: 0.005,
                pool: "pump",
            }),
        });

        if (response.status !== 200) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        // Deserialize the transaction
        const data = await response.arrayBuffer();
        const tx = VersionedTransaction.deserialize(new Uint8Array(data));

        tx.sign([mintKeypair]);
        
        // Request wallet to sign and send the transaction
        const signedTx = await wallet.signTransaction(tx);

        // Send the transaction using Solana connection
        const signature = await connection.sendTransaction(signedTx, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
          
          // 🔍 Wait for confirmation
          const latestBlockhash = await connection.getLatestBlockhash("finalized");
          
          await connection.confirmTransaction(
            {
              signature,
              blockhash: latestBlockhash.blockhash,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            "finalized"
          );

        // Add token to the database
        await addToken({ mint: mintKeypair.publicKey.toBase58().toString() });
  
        return signature;
    } catch (error) {
        console.error("Error creating transaction:", error.message);
        throw error;
    }
}
