// routes/share.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Share = require('../models/Share');

const router = express.Router();

// 파일 저장 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// POST /api/share/upload (공유 링크 생성)
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const fileNames = req.files.map((file) => file.filename);
    const share = new Share({ files: fileNames });
    await share.save();

    res.json({ success: true, shareId: share._id });
  } catch (err) {
    console.error('업로드 실패:', err);
    res.status(500).json({ success: false, error: '파일 업로드 실패' });
  }
});

// GET /api/share/:id (공유 링크 접속 시 파일 목록 반환)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const share = await Share.findById(id);
    if (!share) {
      return res.status(404).json({ success: false, message: '공유 정보가 존재하지 않습니다.' });
    }

    const fileUrls = share.files.map(fileName =>
      `https://stl-viewer-backend.onrender.com/uploads/${fileName}`
    );

    res.json({ success: true, files: fileUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
