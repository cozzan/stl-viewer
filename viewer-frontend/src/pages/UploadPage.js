// UploadPage.js
import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://stl-viewer-backend.onrender.com'
    : 'http://localhost:3001';

function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFiles([...e.target.files]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('파일을 선택해주세요.');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      setUploading(true);

      const res = await axios.post(`${API_BASE_URL}/api/share/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const shareId = res.data.shareId;
      const shareUrl = `${window.location.origin}/share/${shareId}`;
      alert(`공유 링크가 생성되었습니다:\n${shareUrl}`);
    } catch (err) {
      console.error('업로드 실패:', err);
      alert('공유 링크 생성에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2>STL 업로드</h2>
      <input type="file" multiple onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? '업로드 중...' : '공유 링크 생성'}
      </button>
    </div>
  );
}

export default UploadPage;
