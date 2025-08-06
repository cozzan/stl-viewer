// SharePage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Loader } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';

function Model({ fileUrl, color, opacity }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(
      fileUrl,
      (geo) => setGeometry(geo),
      undefined,
      (err) => console.error('STL Load Error:', err)
    );
  }, [fileUrl]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      material={new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.1,
        roughness: 0.75,
        transparent: true,
        opacity,
        side: THREE.DoubleSide, // 중요: 양면 렌더링으로 어느 방향이든 잘 보이게
      })}
    />
  );
}

function SharePage() {
  const { id } = useParams();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/share/${id}`);
        const data = await res.json();

        const loaded = data.files.map((file, i) => ({
          url: `http://localhost:3001/uploads/${file}`,
          color: '#FFD700',
          opacity: 1.0,
        }));

        setFiles(loaded);
      } catch (err) {
        console.error('공유 파일 불러오기 실패:', err);
        alert('파일을 불러오는 데 실패했습니다.');
      }
    };

    fetchFiles();
  }, [id]);

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        {files.map((f, i) => (
          <Model
            key={i}
            fileUrl={f.url}
            color={f.color}
            opacity={f.opacity}
          />
        ))}
        <OrbitControls />
      </Canvas>
      <Loader />
    </div>
  );
}

export default SharePage;
