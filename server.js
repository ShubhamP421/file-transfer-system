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

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

let fileDB = {};

app.get("/", (req, res) => {
  res.send("File Transfer Server is Live");
});

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
        resource_type: "auto", 
        flags: "attachment",  
        use_filename: true, 
        unique_filename: true 
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Error Details:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    stream.end(req.file.buffer);
  });
};

    const result = await streamUpload();
    const code = shortid.generate().substring(0, 4).toLowerCase();
    fileDB[code] = {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type, 
      original_name: originalName
    };

    const EXPIRY_MS = 2 * 60 * 60 * 1000; 

    setTimeout(async () => {
      if (fileDB[code]) {
        try {
          await cloudinary.uploader.destroy(fileDB[code].public_id, { 
            resource_type: fileDB[code].resource_type 
          });
          delete fileDB[code];
          console.log(`Cleanup: Code ${code} expired.`);
        } catch (err) {
          console.error("Cleanup Error:", err);
        }
      }
    }, EXPIRY_MS);

    res.json({
      message: "File uploaded successfully",
      code: code,
      expiresIn: "2 hours",
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Upload failed");
  }
});
app.get("/file/:code", (req, res) => {
  const code = req.params.code;
  const fileData = fileDB[code];

  if (!fileData) {
    return res.status(404).json({ error: "File not found" });
  }

  let downloadUrl = fileData.url;
  
  const attachmentTag = `fl_attachment:${encodeURIComponent(fileData.original_name.split('.')[0])}/`;
  downloadUrl = downloadUrl.replace("/upload/", `/upload/${attachmentTag}`);

  res.json({
    downloadUrl: downloadUrl,
    fileName: fileData.original_name
  });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
