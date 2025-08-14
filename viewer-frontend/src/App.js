// viewer-frontend/src/App.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Loader } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://stl-viewer-backend.onrender.com";

/** 카테고리 */
const CATS = ["대합치", "보철물", "T-BAR", "GUM"];

/** 카테고리 색상(연한 계열) */
const CAT_COLOR = {
  대합치: "#DEB887", // 연한 황토색
  보철물: "#FFD700", // 연한 금색
  "T-BAR": "#D3D3D3", // 연한 회색
  GUM: "#CD5C5C", // 연한 붉은색
};

/** 3D 모델 */
function Model({ fileUrl, color = "#FFD700", opacity = 1, position = [0, 0, 0] }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    if (!fileUrl) return;
    const loader = new STLLoader();
    let mounted = true;

    loader.load(
      fileUrl,
      (geo) => {
        if (!mounted) return;
        geo.computeVertexNormals();
        setGeometry(geo);
      },
      undefined,
      (err) => console.error("STL load error:", err)
    );

    return () => {
      mounted = false;
      setGeometry(null);
    };
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
  return <mesh geometry={geometry} material={material} position={position} />;
}

/* =========================================
 * 업로드 페이지
 * =======================================*/
function UploadPage() {
  // 모델: {id, name, url, file, visible, opacity, category, color}
  const [models, setModels] = useState([]);

  // 전역 "파일 추가" 입력 (여러 개 한 번에)
  const anyInputRef = useRef(null);

  // 카테고리별 "파일 추가" 입력
  const inputRefs = {
    대합치: useRef(null),
    보철물: useRef(null),
    "T-BAR": useRef(null),
    GUM: useRef(null),
  };

  // 파일 추가 유틸
  const addFiles = (fileList, category) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      file: f,
      url: URL.createObjectURL(f),
      visible: true,
      opacity: 1,
      category,
      color: CAT_COLOR[category] || "#FFD700",
    }));
    setModels((prev) => [...prev, ...arr]);
  };

  // 전역 입력 change: 새로 추가되는 파일은 기본 카테고리를 "보철물"로 시작 (원하시면 바꿔도 됩니다)
  const onAnyFiles = (e) => addFiles(e.target.files, "보철물");

  // 카테고리 입력 change
  const onCatFiles = (cat) => (e) => addFiles(e.target.files, cat);

  // 카테고리별 렌더링
  const listBy = (cat) => models.filter((m) => m.category === cat);

  // 카테고리 변경 시 색상 자동 갱신
  const handleCategoryChange = (id, newCat) => {
    setModels((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, category: newCat, color: CAT_COLOR[newCat] } : m
      )
    );
  };

  // 안전: url revoke (선택)
  useEffect(() => {
    return () => {
      models.forEach((m) => {
        if (m.url && m.url.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(m.url);
          } catch {}
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 공유 링크 생성
  const handleShare = async () => {
    const selected = models.filter((m) => m.visible && m.opacity > 0);
    if (selected.length === 0) {
      alert("먼저 STL 파일을 업로드해주세요.");
      return;
    }
    const formData = new FormData();
    selected.forEach((m) => m.file && formData.append("files", m.file));

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
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    } catch (err) {
      console.error(err);
      alert("공유 링크 생성에 실패했습니다.");
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 좌측 패널 */}
      <aside
        style={{
          width: 360,
          padding: 16,
          overflowY: "auto",
          borderRight: "1px solid #eee",
        }}
      >
        <h2>STL 업로드</h2>

        {/* 상단 버튼: 전역 파일 추가 + 공유 링크 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => anyInputRef.current?.click()}>파일 추가</button>
          <button onClick={handleShare}>공유 링크 생성</button>
        </div>
        <input
          ref={anyInputRef}
          type="file"
          accept=".stl"
          multiple
          style={{ display: "none" }}
          onChange={onAnyFiles}
        />

        {/* 카테고리 섹션 */}
        {CATS.map((cat) => {
          const list = listBy(cat);
          return (
            <section key={cat} style={{ marginTop: 18 }}>
              <h3 style={{ margin: "10px 0" }}>
                {cat} <span style={{ color: "#999" }}>({list.length})</span>
              </h3>
              <button
                onClick={() => inputRefs[cat].current?.click()}
                style={{ marginBottom: 8 }}
              >
                {cat} 파일 추가
              </button>
              <input
                ref={inputRefs[cat]}
                type="file"
                accept=".stl"
                multiple
                style={{ display: "none" }}
                onChange={onCatFiles(cat)}
              />

              {list.map((m) => (
                <div key={m.id} style={{ marginBottom: 10 }}>
                  {/* 이름/카테고리/표시 체크 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={m.visible}
                      onChange={(e) =>
                        setModels((prev) =>
                          prev.map((x) =>
                            x.id === m.id ? { ...x, visible: e.target.checked } : x
                          )
                        )
                      }
                      title="표시"
                    />
                    <span
                      style={{
                        width: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={m.name}
                    >
                      {m.name}
                    </span>

                    <select
                      value={m.category}
                      onChange={(e) => handleCategoryChange(m.id, e.target.value)}
                      title="카테고리"
                    >
                      {CATS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 투명도 슬라이더 */}
                  <div>
                    <div style={{ fontSize: 12, color: "#666" }}>투명도:</div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={m.opacity}
                      onChange={(e) =>
                        setModels((prev) =>
                          prev.map((x) =>
                            x.id === m.id
                              ? { ...x, opacity: Number(e.target.value) }
                              : x
                          )
                        )
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </aside>

      {/* 우측 3D 뷰어 */}
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stage>
            {models
              .filter((m) => m.visible && m.opacity > 0)
              .map((m) => (
                <Model
                  key={m.id}
                  fileUrl={m.url}
                  color={m.color}
                  opacity={m.opacity}
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

/* =========================================
 * 공유 페이지
 * =======================================*/
function SharePage() {
  const { id } = useParams();
  // { url, visible, opacity }
  const [files, setFiles] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "조회 실패");

        const fileUrls = (data.files || []).map((f) =>
          typeof f === "string"
            ? f
            : `https://stl-viewer-backend.onrender.com/uploads/${f.filename}`
        );

        setFiles(
          fileUrls.map((u) => ({
            url: u,
            visible: true,
            opacity: 1,
          }))
        );
      } catch (e) {
        console.error(e);
        alert("공유된 파일을 불러오는 데 실패했습니다.");
      }
    })();
  }, [id]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 좌측(토글/투명도) — 파일명은 숨김 */}
      <aside
        style={{
          width: 280,
          padding: 16,
          overflowY: "auto",
          borderRight: "1px solid #eee",
        }}
      >
        <h3>표시 / 투명도</h3>
        {files.map((f, idx) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={f.visible}
                onChange={(e) =>
                  setFiles((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, visible: e.target.checked } : x
                    )
                  )
                }
              />
              <span
                style={{
                  width: 140,
                  height: 10,
                  borderRadius: 4,
                  background: "#ddd",
                  display: "inline-block",
                }}
                title={f.visible ? "표시 중" : "숨김"}
              />
            </label>
            <div style={{ marginTop: 4 }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={f.opacity}
                onChange={(e) =>
                  setFiles((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, opacity: Number(e.target.value) } : x
                    )
                  )
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>
        ))}
      </aside>

      {/* 우측 3D */}
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stage>
            {files
              .filter((f) => f.visible && f.opacity > 0)
              .map((f, idx) => (
                <Model key={idx} fileUrl={f.url} opacity={f.opacity} />
              ))}
          </Stage>
          <OrbitControls />
        </Canvas>
        <Loader />
      </div>
    </div>
  );
}

/* =========================================
 * 라우팅
 * =======================================*/
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
