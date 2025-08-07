import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Loader } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function Model({ fileUrl }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(fileUrl, (geo) => {
      geo.computeVertexNormals();
      setGeometry(geo);
    });
  }, [fileUrl]);

  if (!geometry) return null;

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFD700'),
    metalness: 0.1,
    roughness: 0.75,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
  });

  return <mesh geometry={geometry} material={material} />;
}

export default function SharePage() {
  const { id } = useParams();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const fetchSharedFiles = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/${id}`);
        const data = await res.json();
        if (res.ok) {
          setFiles(data.files);
        } else {
          throw new Error(data.error || '파일 불러오기 실패');
        }
      } catch (err) {
        console.error(err);
        alert('공유된 파일을 불러오는 데 실패했습니다.');
      }
    };

    fetchSharedFiles();
  }, [id]);

  return (
    <div style={{ height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Stage>
          {files.map((file, idx) => (
            <Model key={idx} fileUrl={`${API_BASE}/${file}`} />
          ))}
        </Stage>
        <OrbitControls />
      </Canvas>
      <Loader />
    </div>
  );
}
