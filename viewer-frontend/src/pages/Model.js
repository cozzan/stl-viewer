// src/pages/Model.js
import React, { useState, useEffect } from 'react';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';

function Model({ fileUrl, color = '#FFD700', opacity = 1.0 }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(
      fileUrl,
      (geo) => {
        geo.computeVertexNormals();   // 표면 정리
        // geo.center(); ❌ 제거해서 원래 축 기준 유지
        setGeometry(geo);
      },
      undefined,
      (err) => console.error('STL Load Error:', err)
    );
  }, [fileUrl]);

  if (!geometry) return null;

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.1,
    roughness: 0.75,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,  // ✅ 양면 렌더링
    depthWrite: true,
  });

  return (
    <mesh geometry={geometry} material={material} />
  );
}

export default Model;
