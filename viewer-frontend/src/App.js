// ... (기존 import 유지)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Loader } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://stl-viewer-backend.onrender.com";

function Model({ fileUrl, color = "#FFD700", opacity = 1 }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(fileUrl, (geo) => {
      geo.computeVertexNormals();
      setGeometry(geo);
    });
  }, [fileUrl]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.1,
        roughness: 0.75,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
      }),
    [color, opacity]
  );

  if (!geometry) return null;
  return <mesh geometry={geometry} material={material} />;
}

// ======================== 업로드 페이지 ========================
function UploadPage() {
  const [models, setModels] = useState([]);
  const upperInputRef = useRef(null);
  const lowerInputRef = useRef(null);
  const barInputRef = useRef(null);
  const gumInputRef = useRef(null);

  const addFiles = (fileList, category) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      file: f,
      url: URL.createObjectURL(f),
      opacity: 1,
      visible: true,
      category,
      color: "#FFD700",
    }));
    setModels((prev) => [...prev, ...arr]);
  };

  const handleShare = async () => {
    const selected = models.filter((m) => m.visible);
    if (selected.length === 0) {
      alert("먼저 STL 파일을 업로드해주세요.");
      return;
    }
    const formData = new FormData();
    selected.forEach((m) => {
      if (m.file) formData.append("files", m.file);
    });

    try {
      const res = await fetch(`${API_BASE}/api/share/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const shareId = data.shareId || data.id;
      if (!shareId) throw new Error("shareId 없음");
      const url = `${window.location.origin}/share/${shareId}`;
      alert(`공유 링크가 생성되었습니다:\n${url}`);
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error(err);
      alert("공유 링크 생성에 실패했습니다.");
    }
  };

  const CATS = ["UPPER", "LOWER", "BAR", "GUM"];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 360, padding: 16, overflowY: "auto", borderRight: "1px solid #eee" }}>
        <h2>STL 업로드</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="file"
            accept=".stl"
            multiple
            style={{ display: "none" }}
            ref={(el) => (window.mainUploadInput = el)}
            onChange={(e) => addFiles(e.target.files, "UPPER")}
          />
          <button onClick={() => window.mainUploadInput.click()}>파일 추가</button>
          <button onClick={handleShare}>공유 링크 생성</button>
        </div>

        <input ref={upperInputRef} type="file" accept=".stl" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files, "UPPER")} />
        <input ref={lowerInputRef} type="file" accept=".stl" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files, "LOWER")} />
        <input ref={barInputRef} type="file" accept=".stl" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files, "BAR")} />
        <input ref={gumInputRef} type="file" accept=".stl" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files, "GUM")} />

        {CATS.map((cat) => (
          <div key={cat} style={{ marginTop: 18 }}>
            <h3>{cat} ({models.filter((m) => m.category === cat).length})</h3>
            <button onClick={() => {
              if (cat === "UPPER") upperInputRef.current.click();
              if (cat === "LOWER") lowerInputRef.current.click();
              if (cat === "BAR") barInputRef.current.click();
              if (cat === "GUM") gumInputRef.current.click();
            }}>
              {cat} 파일 추가
            </button>
            {models.filter((m) => m.category === cat).map((m) => (
              <div key={m.id}>
                <input
                  type="checkbox"
                  checked={m.visible}
                  onChange={(e) => setModels((prev) => prev.map((x) => x.id === m.id ? { ...x, visible: e.target.checked } : x))}
                />
                {m.name}
              </div>
            ))}
          </div>
        ))}
      </aside>

      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stage>
            {models.filter((m) => m.visible).map((m) => (
              <Model key={m.id} fileUrl={m.url} color={m.color} opacity={m.opacity} />
            ))}
          </Stage>
          <OrbitControls />
        </Canvas>
        <Loader />
      </div>
    </div>
  );
}

// ======================== 공유 페이지 ========================
function SharePage() {
  const { id } = useParams();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/${id}`);
        const data = await res.json();
        const fileObjs = (data.files || []).map((f) => ({
          url: typeof f === "string" ? f : `https://stl-viewer-backend.onrender.com/uploads/${f.filename}`,
          visible: true
        }));
        setFiles(fileObjs);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [id]);

  const toggleVisibility = (index) => {
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, visible: !f.visible } : f));
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 300, padding: 16, overflowY: "auto", borderRight: "1px solid #eee" }}>
        <h2>공유된 STL</h2>
        {files.map((file, idx) => (
          <div key={idx}>
            <input
              type="checkbox"
              checked={file.visible}
              onChange={() => toggleVisibility(idx)}
            />
            파일 {idx + 1}
          </div>
        ))}
      </aside>

      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stage>
            {files.filter((f) => f.visible).map((f, idx) => (
              <Model key={idx} fileUrl={f.url} />
            ))}
          </Stage>
          <OrbitControls />
        </Canvas>
        <Loader />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/share/:id" element={<SharePage />} />
      </Routes>
    </Router>
  );
}
