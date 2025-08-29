// server/server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

// uploads 폴더 보장
const uploadsRoot = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

// 미들웨어
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 정적 제공: /uploads/<id>/<filename>
app.use("/uploads", express.static(uploadsRoot));

// 라우트
const shareRouter = require("./routes/share");
app.use("/api/share", shareRouter);

// 헬스체크
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
