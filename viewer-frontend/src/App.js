// App.js
import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Loader } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function Model({ fileUrl, visible, opacity, position, color }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(
      fileUrl,
      (geo) => {
        geo.computeVertexNormals(); // 법선 계산
        setGeometry(geo);
      },
      undefined,
      (error) => console.error('STL load error:', error)
    );
  }, [fileUrl]);

  if (!geometry || !visible) return null;

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.1,
    roughness: 0.75,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide, // 양면 렌더링
  });

  return <mesh geometry={geometry} material={material} position={position} />;
}

function App() {
  const [models, setModels] = useState([]);

  const getColorByFileName = (fileName) => {
    const name = fileName.toLowerCase();

    if (
      name.includes('upper') ||
      name.includes('lower') ||
      name.includes('pro') ||
      name.includes('wash')
    ) {
      return '#FFD700'; // 금색
    }

    if (
      name.includes('original') ||
      name.includes('opposing')
    ) {
      return '#FF9999'; // 연빨강
    }

    if (name.includes('bar')) {
      return '#DDDDDD'; // 밝은 회색
    }

    return '#AAAAAA'; // 기본 회색
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newModels = files.map((file, index) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      file,
      visible: true,
      opacity: 1.0,
      id: `${file.name}-${Date.now()}-${index}`,
      position: [0, 0, 0],
      color: getColorByFileName(file.name),
    }));
    setModels((prev) => [...prev, ...newModels]);
  };

  const toggleVisibility = (id) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m))
    );
  };

  const changeOpacity = (id, newOpacity) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, opacity: newOpacity } : m))
    );
  };

  const handleShare = async () => {
    const formData = new FormData();

    models.forEach((model) => {
      if (model.file) {
        formData.append('files', model.file);
      }
    });

    try {
      const res = await fetch(`${API_BASE}/api/share/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const shareUrl = `${window.location.origin}/share/${data.shareId}`;
        alert(`공유 링크가 생성되었습니다:\n${shareUrl}`);
        navigator.clipboard.writeText(shareUrl);
      } else {
        throw new Error(data.error || '공유 실패');
      }
    } catch (err) {
      console.error('공유 에러:', err);
      alert('공유 링크 생성에 실패했습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '280px', background: '#f0f0f0', padding: '1rem', overflowY: 'auto' }}>
        <h3>STL 업로드</h3>
        <input type="file" multiple accept=".stl" onChange={handleFileChange} />
        <hr />
        <h4>파일 목록</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {models.map((model) => (
            <li key={model.id} style={{ marginBottom: '1rem' }}>
              <label>
                <input
                  type="checkbox"
                  checked={model.visible}
                  onChange={() => toggleVisibility(model.id)}
                />{' '}
                {model.name}
              </label>
              <div>
                투명도: {Math.round(model.opacity * 100)}%
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={model.opacity}
                  onChange={(e) =>
                    changeOpacity(model.id, parseFloat(e.target.value))
                  }
                  style={{ width: '100%' }}
                />
              </div>
            </li>
          ))}
        </ul>

        <button onClick={handleShare} style={{ marginTop: '1rem' }}>
          공유 링크 생성
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stage>
            {models.map((m) => (
              <Model
                key={m.id}
                fileUrl={m.url}
                visible={m.visible}
                opacity={m.opacity}
                position={m.position}
                color={m.color}
              />
            ))}
          </Stage>
          <OrbitControls />
        </Canvas>
        <Loader />
      </div>
    </div>
  );
}

export default App;
