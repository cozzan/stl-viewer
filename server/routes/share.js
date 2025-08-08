const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 업로드 폴더 설정
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

// 공유 파일 업로드 API
router.post('/upload', upload.array('files'), (req, res) => {
  const id = uuidv4();
  const fileInfos = req.files.map(file => ({
    filename: file.filename,
    originalname: file.originalname
  }));

  // JSON 파일로 저장
  const jsonPath = path.join(uploadFolder, `${id}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(fileInfos, null, 2));

  res.json({ success: true, shareId: id, files: fileInfos });
});

// 공유 링크 접근 시 파일 정보 반환
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const jsonPath = path.join(uploadFolder, `${id}.json`);

  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ success: false, message: '공유 정보를 찾을 수 없습니다.' });
  }

  try {
    const data = fs.readFileSync(jsonPath, 'utf-8');
    const fileInfos = JSON.parse(data);
    const fileNames = fileInfos.map(f => f.filename);
    res.json({ success: true, shareId: id, files: fileNames });
  } catch (err) {
    console.error('파일 읽기 오류:', err);
    res.status(500).json({ success: false, message: '파일 정보를 읽을 수 없습니다.' });
  }
});

module.exports = router;
