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
            resource_type: "auto", // Automatically detects PDF, ZIP, PNG, etc.
            public_id: `file_${shortid.generate()}`,
            use_filename: true,
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

    // Store essential data including resource_type for correct URL construction
    fileDB[code] = {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type, 
      original_name: originalName,
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
  const code = req.params.code;
  const fileData = fileDB[code];

  if (!fileData) {
    return res.status(404).json({ error: "File not found ❌" });
  }

  const { url, resource_type, original_name } = fileData;

  /**
   * REWRITE LOGIC:
   * Cloudinary URLs follow: .../[resource_type]/upload/v1234/[public_id]
   * We insert 'fl_attachment:filename' after '/upload/' to force download 
   * with the original name.
   */
  const attachmentFlag = `fl_attachment:${encodeURIComponent(original_name)}`;
  
  // We dynamically match the resource type (image, raw, or video) in the URL string
  const searchPattern = `/${resource_type}/upload/`;
  const replacement = `/${resource_type}/upload/${attachmentFlag}/`;
  
  const downloadUrl = url.replace(searchPattern, replacement);

  res.json({
    downloadUrl: downloadUrl,
    fileName: original_name,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
