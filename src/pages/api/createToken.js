import formidable from "formidable";
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false, // Disable default body parsing
    },
};

export default async function handler(req, res) {

    if (req.method === "POST") {
        const form = formidable({ multiples: false, keepExtensions: true });

        if (!fs.existsSync(form.uploadDir)) {
            fs.mkdirSync(form.uploadDir, { recursive: true });
        }

        try {
            const [fields, files] = await new Promise((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err);
                    else resolve([fields, files]);
                });
            });

            const file = files.file;
            if (!file) {
                return res.status(400).json({ error: "No file received" });
            }

            const formData = new FormData();
            formData.append("file", await fs.openAsBlob(file[0].filepath)); // Image file uploaded from the frontend
            formData.append("name", fields.name[0] || '');
            formData.append("symbol", fields.symbol[0] || '');
            formData.append("description", fields.description[0] || '');
            formData.append("twitter", fields.twitter[0] || '');
            formData.append("telegram", fields.telegram[0] || '');
            formData.append("website", fields.website[0] || '');
            formData.append("showName", 'true');

            // Send request to Pump.fun API
            const response = await fetch("https://pump.fun/api/ipfs", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Failed to upload to pump.fun");

            const responseData = await response.json();
            res.status(200).json({
                metadataUri: responseData.metadataUri,
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
    res.status(405).json({ error: "Method not allowed" });
}
