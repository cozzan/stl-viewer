// viewer-frontend/src/App.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Loader } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://stl-viewer-backend.onrender.com";

// 카테고리 상수
const CATS = ["UPPER", "LOWER", "BAR", "GUM"];
const CAT_LABEL = { UPPER: "UPPER", LOWER: "LOWER", BAR: "BAR", GUM: "GUM" };
const CAT_COLOR = { UPPER: "#FFC107", LOWER: "#50C878", BAR: "#3F51B5", GUM: "#E57373" };

// 3D 모델 로더
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
  const upperRef = useRef(null);
  const lowerRef = useRef(null);
  const barRef = useRef(null);
  const gumRef = useRef(null);
  const allRef = useRef(null);

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
      color: CAT_COLOR[category] || "#FFD700",
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
      const res = await fetch(`${API_BASE}/api/share/upload`, { method: "POST", body: formData });
      const data = await res.json();
      const shareId = data.shareId || data.id;
      if (!shareId) throw new Error("shareId 없음");
      const url = `${window.location.origin}/share/${shareId}`;
      alert(`공유 링크가 생성되었습니다:\n${url}`);
      await navigator.clipboard.writeText(url);
    } catch {
      alert("공유 링크 생성 실패");
    }
  };

  const groupByCat = (cat) => models.filter((m) => m.category === cat);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 360, padding: 16, overflowY: "auto", borderRight: "1px solid #eee" }}>
        <h2>STL 업로드</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleShare}>공유 링크 생성</button>
          <button onClick={() => allRef.current.click()}>파일 추가</button>
        </div>

        {/* 숨김 input들 */}
        <input ref={upperRef} type="file" accept=".stl" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files, "UPPER")} />
        <input ref={lowerRef} type="file" accept=".stl" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files, "LOWER")} />
        <input ref={barRef} type="file" accept=".stl" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files, "BAR")} />
        <input ref={gumRef} type="file" accept=".stl" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files, "GUM")} />
        <input ref={allRef} type="file" accept=".stl" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files, "UPPER")} />

        {/* 카테고리별 */}
        {CATS.map((cat) => {
          const list = groupByCat(cat);
          return (
            <div key={cat} style={{ marginTop: 18 }}>
              <h3>{CAT_LABEL[cat]} <span style={{ color: "#999" }}>({list.length})</span></h3>
              <button
                onClick={() => {
                  if (cat === "UPPER") upperRef.current.click();
                  if (cat === "LOWER") lowerRef.current.click();
                  if (cat === "BAR") barRef.current.click();
                  if (cat === "GUM") gumRef.current.click();
                }}
              >
                {CAT_LABEL[cat]} 파일 추가
              </button>
              {list.map((m) => (
                <div key={m.id} style={{ marginBottom: 8 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={m.visible}
                      onChange={(e) =>
                        setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, visible: e.target.checked } : x)))
                      }
                    />
                    {m.name}
                  </label>
                  <div>투명도: <input type="range" min="0" max="1" step="0.01" value={m.opacity}
                    onChange={(e) => setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, opacity: Number(e.target.value) } : x)))} /></div>
                </div>
              ))}
            </div>
          );
        })}
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
        if (!res.ok) throw new Error();
        const fileObjs = (data.files || []).map((f) => ({
          url: typeof f === "string" ? f : `${API_BASE}/uploads/${f.filename}`,
          opacity: 1,
          visible: true
        }));
        setFiles(fileObjs);
      } catch {
        alert("파일 불러오기 실패");
      }
    })();
  }, [id]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 300, padding: 16, overflowY: "auto", borderRight: "1px solid #eee" }}>
        <h2>모델 제어</h2>
        {files.map((m, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={m.visible}
                onChange={(e) => setFiles((prev) => prev.map((x, i) => (i === idx ? { ...x, visible: e.target.checked } : x)))}
              /> 표시
            </label>
            <div>투명도: <input type="range" min="0" max="1" step="0.01" value={m.opacity}
              onChange={(e) => setFiles((prev) => prev.map((x, i) => (i === idx ? { ...x, opacity: Number(e.target.value) } : x)))} /></div>
          </div>
        ))}
      </aside>

      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stage>
            {files.filter((m) => m.visible).map((m, idx) => (
              <Model key={idx} fileUrl={m.url} opacity={m.opacity} />
            ))}
          </Stage>
          <OrbitControls />
        </Canvas>
        <Loader />
      </div>
    </div>
  );
}

// ======================== 라우팅 ========================
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
