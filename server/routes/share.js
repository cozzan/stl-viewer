const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const uploadFolder = path.join(__dirname, '..', '..', 'uploads');
const shareDataFile = path.join(uploadFolder, 'shared.json');

// uploads 폴더가 없으면 생성
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// JSON 파일이 없으면 초기화
if (!fs.existsSync(shareDataFile)) {
  fs.writeFileSync(shareDataFile, JSON.stringify({}));
}

function readShareData() {
  return JSON.parse(fs.readFileSync(shareDataFile, 'utf-8'));
}

function writeShareData(data) {
  fs.writeFileSync(shareDataFile, JSON.stringify(data, null, 2));
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.post('/upload', upload.array('files'), (req, res) => {
  const id = uuidv4();
  const fileInfos = req.files.map(file => ({
    filename: file.filename,
    originalname: file.originalname
  }));

  const sharedData = readShareData();
  sharedData[id] = fileInfos;
  writeShareData(sharedData);

  res.json({ shareId: id, files: fileInfos });
});

router.get('/:id', (req, res) => {
  const id = req.params.id;
  const sharedData = readShareData();
  const files = sharedData[id];

  if (!files) {
    return res.status(404).json({ message: '공유 링크를 찾을 수 없습니다.' });
  }

  res.json({ id, files });
});

module.exports = router;
