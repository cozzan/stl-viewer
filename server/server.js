const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();


// 미들웨어
app.use(cors());
app.use(express.json());

// 업로드된 파일 제공
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 공유 라우터 연결
const shareRoutes = require('./routes/share');
app.use('/api/share', shareRoutes);

// 시작
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
