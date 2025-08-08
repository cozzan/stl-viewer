const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 업로드 폴더 생성
const uploadFolder = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// 메모리 내에 공유 모델 저장 (임시)
const sharedModels = {};

// 공유 파일 업로드
router.post('/upload', upload.array('files'), (req, res) => {
  const id = uuidv4();
  const fileInfos = req.files.map(file => ({
    filename: file.filename,
    originalname: file.originalname
  }));
  sharedModels[id] = fileInfos;

  // 🔧 응답에 shareId 포함
  res.json({ success: true, shareId: id, files: fileInfos });
});

// 공유 ID로 파일 정보 조회
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const files = sharedModels[id];
  if (!files) {
    return res.status(404).json({ success: false, message: '공유 링크를 찾을 수 없습니다.' });
  }

  const fileNames = files.map(f => f.filename);
  res.json({ success: true, shareId: id, files: fileNames });
});

module.exports = router;
