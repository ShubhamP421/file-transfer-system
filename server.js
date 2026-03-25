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

// Test route
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

/* =========================
   UPLOAD ROUTE
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

    // Generate unique code
    const code = shortid.generate();

    // Store mapping
    fileDB[code] = result.secure_url;

    res.json({
      message: "File uploaded successfully ✅",
      code: code,
      fileUrl: result.secure_url,
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

  const fileUrl = fileDB[code];

  if (!fileUrl) {
    return res.status(404).send("File not found ❌");
  }

  res.json({
    downloadUrl: fileUrl,
  });
}); 

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});