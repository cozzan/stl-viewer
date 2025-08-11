import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Loader } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";

// 백엔드 API 베이스
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://stl-viewer-backend.onrender.com";

/* --------------------------------------------
 * Model: STL 파일 하나를 로딩해서 메쉬로 렌더
 * -------------------------------------------- */
function Model({ fileUrl, color = "#FFD700", opacity = 1, visible = true, position = [0, 0, 0] }) {
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
      (err) => console.error("STL load error:", err)
    );
  }, [fileUrl]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.1,
      roughness: 0.75,
      transparent: opacity < 1,
      opacity,
      side: THREE.DoubleSide,
    });
    return mat;
  }, [color, opacity]);

  if (!geometry || !visible) return null;
  return <mesh geometry={geometry} material={material} position={position} />;
}

/* --------------------------------------------
 * 업로드 페이지
 * - 카테고리(UPPER/LOWER/BAR/GUM)별로 파일 추가
 * - 파일별 가시성/투명도/카테고리 설정
 * - 공유 링크 생성
 * -------------------------------------------- */
function UploadPage() {
  const [models, setModels] = useState([]);
  const nextIdRef = useRef(1);

  // 카테고리별 파일 input 참조
  const inputRefs = {
    UPPER: useRef(null),
    LOWER: useRef(null),
    BAR: useRef(null),
    GUM: useRef(null),
  };

  const handleAddFiles = (category, fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;

    const appended = list.map((file) => ({
      id: nextIdRef.current++,
      name: file.name,
      file,
      url: URL.createObjectURL(file),
      category,
      visible: true,
      opacity: 1,
      color: "#FFD700",
      position: [0, 0, 0],
    }));

    setModels((prev) => [...prev, ...appended]);
  };

  const handleFileInputChange = (category, e) => {
    handleAddFiles(category, e.target.files);
    // 같은 파일 다시 선택 허용
    e.target.value = "";
  };

  const handleOpacityChange = (id, value) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, opacity: value } : m))
    );
  };

  const handleVisibleToggle = (id, checked) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, visible: checked } : m))
    );
  };

  const handleCategoryChange = (id, nextCat) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, category: nextCat } : m))
    );
  };

  // 카테고리 순서대로 파일 선택(연속 선택 워크플로우)
  const openPickerFor = (cat) => {
    inputRefs[cat]?.current?.click();
  };

  const handlePickAllInOrder = async () => {
    // 1) UPPER 2) LOWER 3) BAR 4) GUM 순서로 유도
    openPickerFor("UPPER");
    // 나머지는 사용자가 완료 후 다시 버튼 누르거나 각각 섹션 버튼을 사용하도록 심플하게 둡니다.
  };

  const grouped = useMemo(() => {
    const g = { UPPER: [], LOWER: [], BAR: [], GUM: [] };
    for (const m of models) {
      if (g[m.category]) g[m.category].push(m);
      else g.OTHER ? g.OTHER.push(m) : (g.OTHER = [m]);
    }
    return g;
  }, [models]);

  const postShare = async () => {
    const selected = models.filter((m) => m.visible); // 예: 체크된 것만 공유
    if (selected.length === 0) {
      alert("공유할 파일을 선택(체크)해 주세요.");
      return;
    }

    const formData = new FormData();
    selected.forEach((m) => {
      if (m.file) formData.append("files", m.file, m.name);
    });

    try {
      const res = await fetch(`${API_BASE}/api/share/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      console.log("[업로드 응답]", data);

      const shareId = data.shareId || data.id;
      if (!res.ok || !shareId) {
        throw new Error(data.message || data.error || "공유 링크 생성 실패");
      }

      const url = `${window.location.origin}/share/${shareId}`;
      alert(`공유 링크가 생성되었습니다:\n${url}`);
      try {
        await navigator.clipboard.writeText(url);
      } catch (_) {}
    } catch (err) {
      console.error(err);
      alert("공유 링크 생성에 실패했습니다.");
    }
  };

  const renderGroup = (title, arr, cat) => (
    <section style={{ marginBottom: 24 }}>
      <h3 style={{ margin: "16px 0 8px" }}>
        {title} ({arr.length})
      </h3>
      <button
        type="button"
        onClick={() => openPickerFor(cat)}
        style={{ marginBottom: 8 }}
      >
        {title} 파일 추가
      </button>
      <input
        ref={inputRefs[cat]}
        type="file"
        accept=".stl"
        multiple
        hidden
        onChange={(e) => handleFileInputChange(cat, e)}
      />

      {arr.map((m) => (
        <div key={m.id} style={{ marginBottom: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={m.visible}
              onChange={(e) => handleVisibleToggle(m.id, e.target.checked)}
              style={{ marginRight: 6 }}
            />
            {m.name}
          </label>

          <select
            value={m.category}
            onChange={(e) => handleCategoryChange(m.id, e.target.value)}
            style={{ marginLeft: 8 }}
          >
            <option value="UPPER">UPPER</option>
            <option value="LOWER">LOWER</option>
            <option value="BAR">BAR</option>
            <option value="GUM">GUM</option>
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>투명도:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={m.opacity}
              onChange={(e) => handleOpacityChange(m.id, Number(e.target.value))}
              style={{ width: 260 }}
            />
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 좌측 패널 */}
      <aside
        style={{
          width: 360,
          padding: 16,
          borderRight: "1px solid #ececec",
          overflow: "auto",
        }}
      >
        <h2 style={{ marginTop: 0 }}>STL 업로드</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={handlePickAllInOrder}>파일 선택(카테고리 순서)</button>
          <button onClick={postShare}>공유 링크 생성</button>
        </div>

        {renderGroup("UPPER", grouped.UPPER, "UPPER")}
        {renderGroup("LOWER", grouped.LOWER, "LOWER")}
        {renderGroup("BAR", grouped.BAR, "BAR")}
        {renderGroup("GUM", grouped.GUM, "GUM")}
      </aside>

      {/* 우측 3D 뷰 */}
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stage>
            {models
              .filter((m) => m.visible)
              .map((m) => (
                <Model
                  key={m.id}
                  fileUrl={m.url}
                  color={m.color}
                  opacity={m.opacity}
                  visible={m.visible}
                  position={m.position}
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

/* --------------------------------------------
 * 공유 페이지
 * - /share/:id 로 접근
 * - 서버에서 업로드된 파일 목록 조회 후 렌더
 * -------------------------------------------- */
function SharePage() {
  const { id } = useParams();
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/${id}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || "조회 실패");
        }
        // files: 문자열 또는 {filename,...} 객체일 수 있음 → URL 배열로 통일
        const fileUrls = (data.files || []).map((f) => {
          const name = typeof f === "string" ? f : f.filename;
          return String(name).startsWith("http")
            ? name
            : `${API_BASE}/uploads/${name}`;
        });
        setUrls(fileUrls);
        console.log("[SharePage] files =>", fileUrls);
      } catch (e) {
        console.error(e);
        alert("공유된 파일을 불러오는 데 실패했습니다.");
      }
    })();
  }, [id]);

  return (
    <div style={{ height: "100vh" }}>
      <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Stage>
          {urls.map((url, idx) => (
            <Model key={idx} fileUrl={url} />
          ))}
        </Stage>
        <OrbitControls />
      </Canvas>
      <Loader />
    </div>
  );
}

/* --------------------------------------------
 * 라우팅
 * -------------------------------------------- */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/share/:id" element={<SharePage />} />
        {/* 테스트 페이지가 있다면 링크할 수 있음 */}
        {/* <Route path="/share/test" element={<SharePage />} /> */}
      </Routes>
    </Router>
  );
}
