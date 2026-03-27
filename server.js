require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📦 Storage (Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "videos",
    resource_type: "video",
  },
});

const upload = multer({ storage });

// 🗄️ PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// ─────────────────────────────────────────
// RUN THIS SQL IN YOUR POSTGRES FIRST:
//
// ALTER TABLE video_library ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
// ALTER TABLE video_library ADD COLUMN IF NOT EXISTS discord_tag VARCHAR(100);
// ─────────────────────────────────────────

// 📥 Get all videos
app.get("/videos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM video_library ORDER BY video_id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching videos");
  }
});

// 📥 Get single player by ID
app.get("/videos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM video_library WHERE video_id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send("Player not found");
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching player");
  }
});

// 👁️ Increment view count
app.post("/videos/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE video_library SET views = views + 1 WHERE video_id = $1",
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating view count");
  }
});

// 📤 Upload video
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const { name, gaming_name, game, rank, discord_tag } = req.body;

    const video_path = req.file.path;

    const result = await pool.query(
      `INSERT INTO video_library 
       (video_path, name, gaming_name, game, rank, discord_tag) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [video_path, name, gaming_name, game, rank, discord_tag || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error uploading video");
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});