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

/* =========================
   CLOUDINARY CONFIG
========================= */
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

/* =========================
   MULTER CONFIG
========================= */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* =========================
   TEMP DATABASE (IN-MEMORY)
========================= */
let fileDB = {};

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("🚀 File Transfer Server is Live");
});

/* =========================
   UPLOAD ROUTE (WITH AUTO-DELETE)
========================= */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    // Upload to Cloudinary
    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const result = await streamUpload();

    // --- FIX: 4 CHAR LOWERCASE CODE ---
    const code = shortid.generate().substring(0, 4).toLowerCase();

    // Store mapping with public_id for deletion
    fileDB[code] = {
      url: result.secure_url,
      public_id: result.public_id,
    };

    // --- AUTO-DELETE LOGIC ---
    const EXPIRY_MS = 2 * 60 * 60 * 1000; 

    setTimeout(async () => {
      if (fileDB[code]) {
        try {
          // 1. Physically delete from Cloudinary
          await cloudinary.uploader.destroy(fileDB[code].public_id);
          // 2. Remove from Server Memory
          delete fileDB[code];
          console.log(`Cleanup: Code ${code} expired and file deleted from Cloud.`);
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
    console.error(error);
    res.status(500).send("Upload failed");
  }
});

/* =========================
   DOWNLOAD ROUTE
========================= */
app.get("/file/:code", (req, res) => {
  const code = req.params.code;
  const fileData = fileDB[code];

  if (!fileData) {
    return res.status(404).json({ error: "File not found ❌" });
  }

  // This magic line transforms the URL into a download link
  const downloadUrl = fileData.url.replace("/upload/", "/upload/fl_attachment/");

  res.json({
    downloadUrl: downloadUrl,
  });
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});