const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 업로드된 STL 파일을 정적으로 서빙
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 업로드 설정
const upload = multer({ dest: 'public/uploads/' });

// 공유 링크 생성 API
app.post('/api/share/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const id = uuidv4();

  // 파일 이름 목록만 저장
  const data = req.files.map((file) => file.filename);

  // JSON 파일로 저장
  const shareDir = path.join(__dirname, 'public/shares');
  if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(shareDir, `${id}.json`),
    JSON.stringify({ files: data }, null, 2)
  );

  res.json({ id });
});

// 공유 링크 접근 API
app.get('/api/share/:id', (req, res) => {
  const id = req.params.id;
  const filePath = path.join(__dirname, 'public/shares', `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const data = fs.readFileSync(filePath);
  res.json(JSON.parse(data));
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
