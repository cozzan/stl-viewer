// stl-viewer-backend/server/routes/share.js

const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const router = express.Router();

// 업로드 루트: 프로젝트 루트의 /uploads
// (현재 파일 위치가 server/routes 기준이므로 '..', '..'로 루트로 올라감)
const UPLOADS_ROOT = path.resolve(__dirname, "..", "..", "uploads");

// 공유 ID는 폴더명으로 사용되므로 안전하게 정규화
function sanitizeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * GET /api/share/:id
 * 응답 형식:
 *  {
 *    "id": "<공유ID>",
 *    "files": ["upper.stl", "lower.stl", ...]   // 파일명만 제공
 *  }
 * 프론트에서는 `${API_BASE}/uploads/:id/:filename` 형태로 접근하므로
 * 여기서는 파일명만 내려준다.
 */
router.get("/:id", async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = sanitizeId(rawId);
    if (!id) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const dir = path.join(UPLOADS_ROOT, id);

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "not_found", id, files: [] });
      }
      throw err;
    }

    // STL 파일만 추출 (대/소문자 허용)
    const files = entries
      .filter((ent) => ent.isFile())
      .map((ent) => ent.name)
      .filter((name) => /\.(stl)$/i.test(name));

    return res.json({ id, files });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
