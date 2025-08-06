const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const uploadFolder = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

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

const sharedModels = {};

router.post('/upload', upload.array('files'), (req, res) => {
  const id = uuidv4();
  const fileInfos = req.files.map(file => ({
    filename: file.filename,
    originalname: file.originalname
  }));
  sharedModels[id] = fileInfos;
  res.json({ id, files: fileInfos });
});

router.get('/:id', (req, res) => {
  const id = req.params.id;
  const files = sharedModels[id];
  if (!files) {
    return res.status(404).json({ message: '공유 링크를 찾을 수 없습니다.' });
  }
  res.json({ id, files });
});

module.exports = router;
