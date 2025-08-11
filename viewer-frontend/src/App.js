import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Loader } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';

// ✅ 백엔드 URL: Vercel 환경변수 없으면 Render 기본값 사용
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://stl-viewer-backend.onrender.com';

/* ------------ 공통 STL 모델 렌더러 ------------ */
function Model({ fileUrl, color = '#BEBEBE', opacity = 1 }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    if (!fileUrl) return;
    const loader = new STLLoader();
    loader.load(
      fileUrl,
      (geo) => {
        geo.computeVertexNormals();
        setGeometry(geo);
      },
      undefined,
      (err) => {
        console.error('❌ STL load error:', err, 'fileUrl=', fileUrl);
      }
    );
  }, [fileUrl]);

  if (!geometry) return null;

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.1,
    roughness: 0.75,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });

  return <mesh geometry={geometry} material={material} />;
}

/* ------------ 업로드 페이지 ------------ */
function UploadPage() {
  const [models, setModels] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newItems = files.map((f, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: f.name,
      file: f,
      visible: true,
      opacity: 1,
      color: '#BEBEBE',
      url: URL.createObjectURL(f),
    }));
    setModels((prev) => [...prev, ...newItems]);
  };

  const handleShare = async () => {
    if (!models.length) {
      alert('먼저 STL 파일을 선택해주세요.');
      return;
    }
    try {
      const formData = new FormData();
      models.forEach((m) => m.file && formData.append('files', m.file));

      const res = await fetch(`${API_BASE}/api/share/upload`, { method: 'POST', body: formData });
      const data = await res.json();

      // ✅ 서버 응답에서 shareId 또는 id 지원
      const shareId = data.shareId || data.id;
      if (!res.ok || !shareId) throw new Error(data.message || data.error || '업로드 실패');

      const shareUrl = `${window.location.origin}/share/${shareId}`;
      alert(`공유 링크가 생성되었습니다:\n${shareUrl}`);
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (_) {}
    } catch (err) {
      console.error('❌ 공유 링크 생성 실패:', err);
      alert('공유 링크 생성에 실패했습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 280, padding: '1rem', background: '#f7f7f7' }}>
        <h3>STL 업로드</h3>
        <input type="file" multiple accept=".stl" onChange={handleFileChange} />
        <h4 style={{ marginTop: 16 }}>파일 목록</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {models.map((m) => (
            <li key={m.id} style={{ marginBottom: 8 }}>
              <label style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={m.visible}
                  onChange={() =>
                    setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, visible: !x.visible } : x)))
                  }
                />{' '}
                {m.name}
              </label>
              <div>
                투명도: {Math.round(m.opacity * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={m.opacity}
                  onChange={(e) =>
                    setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, opacity: +e.target.value } : x)))
                  }
                  style={{ width: '100%' }}
                />
              </div>
            </li>
          ))}
        </ul>
        <button onClick={handleShare} style={{ marginTop: 12 }}>
          공유 링크 생성
        </button>
        
      </aside>

      <main style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stage>
            {models
              .filter((m) => m.visible)
              .map((m) => (
                <Model key={m.id} fileUrl={m.url} color={m.color} opacity={m.opacity} />
              ))}
          </Stage>
          <OrbitControls />
        </Canvas>
        <Loader />
      </main>
    </div>
  );
}

/* ------------ 공유 페이지 ------------ */
function SharePage() {
  const { id } = useParams();
  const [fileUrls, setFileUrls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 디버깅 로그 (콘솔에서 꼭 보세요)
    console.log('[SharePage] mounting, id=', id, 'API_BASE=', API_BASE);

    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || '조회 실패');

        // 서버가 문자열 배열 또는 [{filename}] 배열 모두 지원
        const urls = (data.files || []).map((f) =>
          typeof f === 'string' ? `${API_BASE}/uploads/${f}` : `${API_BASE}/uploads/${f.filename}`
        );

        console.log('[SharePage] files =>', urls);
        setFileUrls(urls);
      } catch (e) {
        console.error('❌ 공유 조회 실패:', e);
        alert('공유된 파일을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    if (id) run();
  }, [id]);

  return (
    <div style={{ height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Stage>
          {!loading &&
            fileUrls.map((u, idx) => (
              <Model key={idx} fileUrl={u} color="#FFD700" opacity={1} />
            ))}
        </Stage>
        <OrbitControls />
      </Canvas>
      <Loader />
    </div>
  );
}

/* ------------ 라우팅 루트 ------------ */
export default function App() {
  // BrowserRouter가 꼭 있어야 /share/:id 라우트가 동작합니다.
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/share/:id" element={<SharePage />} />
        {/* 안전망: 알 수 없는 경로 -> 업로드로 */}
        <Route path="*" element={<UploadPage />} />
      </Routes>
    </BrowserRouter>
  );
}
