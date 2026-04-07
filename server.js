const express = require("express");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const shortid = require("shortid");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Temporary In-Memory Database
let fileDB = {};

app.get("/", (req, res) => {
  res.send("🚀 File Transfer Server is Live");
});

// --- UPLOAD ROUTE ---
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const originalName = req.file.originalname;

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            resource_type: "auto", // Crucial: detects if it's 'image' or 'raw'
            folder: "flash_share",
            // We keep the extension in the public_id for 'raw' files to prevent corruption
            public_id: `file_${shortid.generate()}` 
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const result = await streamUpload();
    const code = shortid.generate().substring(0, 4).toLowerCase();

    // Store data. Note: result.format is important for the download helper
    fileDB[code] = {
      public_id: result.public_id,
      resource_type: result.resource_type, 
      original_name: originalName,
      extension: originalName.split('.').pop()
    };

    // Auto-cleanup after 2 hours
    const EXPIRY_MS = 2 * 60 * 60 * 1000; 
    setTimeout(async () => {
      if (fileDB[code]) {
        try {
          await cloudinary.uploader.destroy(fileDB[code].public_id, {
            resource_type: fileDB[code].resource_type
          });
          delete fileDB[code];
          console.log(`Cleanup: Code ${code} deleted.`);
        } catch (err) {
          console.error("Cleanup Error:", err);
        }
      }
    }, EXPIRY_MS);

    res.json({
      message: "File uploaded successfully ✅",
      code: code,
      expiresIn: "2 hours",
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).send("Upload failed");
  }
});

// --- DOWNLOAD/GET ROUTE ---
app.get("/file/:code", (req, res) => {
  const fileData = fileDB[req.params.code];
  if (!fileData) return res.status(404).json({ error: "File not found" });

  const { public_id, resource_type, original_name, extension } = fileData;

  let downloadUrl;

  if (resource_type === "raw") {
    // USE PRIVATE DOWNLOAD URL FOR RAW FILES (PDF, ZIP, etc.)
    // This generates a signed, authenticated URL that avoids the 0B error
    downloadUrl = cloudinary.utils.private_download_url(public_id, extension, {
      resource_type: "raw",
      attachment: true,
      filename: original_name
    });
  } else {
    // USE STANDARD URL FOR IMAGES
    downloadUrl = cloudinary.url(public_id, {
      resource_type: "image",
      flags: "attachment",
      attachment: original_name,
      secure: true
    });
  }

  res.json({
    downloadUrl: downloadUrl,
    fileName: original_name
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
