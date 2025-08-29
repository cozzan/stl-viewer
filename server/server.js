// stl-viewer-backend/server/server.js
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// 기본 미들웨어
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
// 일단 모든 오리진 허용(배포 도메인 정해지면 화이트리스트로 좁혀도 됨)
app.use(cors({ origin: true, credentials: true }));

// 정적 업로드 폴더 서빙: /uploads/<id>/<filename>
const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads"); // 프로젝트 루트의 /uploads
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    fallthrough: true,
    etag: true,
    maxAge: "1h",
  })
);

// API 라우트
const shareRouter = require("./routes/share");
app.use("/api/share", shareRouter);

// 헬스체크 & 루트
app.get("/healthz", (_, res) => res.status(200).send("ok"));
app.get("/", (_, res) => res.status(200).send("stl-viewer backend running"));

// /api에서의 404 처리
app.use("/api", (req, res) => {
  res.status(404).json({ error: "not_found" });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "server_error" });
});

// 서버 시작
const PORT = process.env.PORT || 10000; // Render가 PORT를 주면 그걸 사용
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
