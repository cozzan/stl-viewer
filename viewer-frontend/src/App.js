// viewer-frontend/src/App.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Loader } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";

// 백엔드 베이스 URL (Vercel 환경변수 사용 권장)
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://stl-viewer-backend.onrender.com";

// 카테고리 / 라벨 / 색상 (연한 톤)
const CATS = ["대합치", "보철물", "T-BAR", "GUM"];
const CAT_LABEL = { 대합치: "대합치", 보철물: "보철물", "T-BAR": "T-BAR", GUM: "GUM" };
const CAT_COLOR = {
  대합치: "#DEB887", // 연한 황토색
  보철물: "#FFD700", // 연한 금색
  "T-BAR": "#D3D3D3", // 연한 회색
  GUM: "#CD5C5C",     // 연한 붉은색
};

// 공통 STL 모델 컴포넌트
function Model({ fileUrl, color = "#FFD700", opacity = 1 }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loader = new STLLoader();
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
  return <mesh geometry={geometry} material={material} />;
}

/* ====================== 업로드 페이지 ====================== */
function UploadPage() {
  // { id, name, file, url, visible, opacity, category, color }
  const [models, setModels] = useState([]);

  // 숨김 input 1개로 “카테고리별 추가”와 “일반 추가”를 모두 처리
  const fileInputRef = useRef(null);
  const pendingCatRef = useRef(null); // 현재 선택된 카테고리(일반 추가면 보철물)

  // 파일을 상태에 추가
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
      color: CAT_COLOR[category] || CAT_COLOR["보철물"],
    }));
    setModels((prev) => [...prev, ...arr]);
  };

  // 숨김 input onChange
  const handleFilesChosen = (e) => {
    const cat = pendingCatRef.current || "보철물";
    addFiles(e.target.files, cat);
    pendingCatRef.current = null;
  };

  // 일반 “파일 추가” 버튼
  const onPickGeneral = () => {
    pendingCatRef.current = "보철물";
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  // 카테고리별 “파일 추가” 버튼
  const onPickByCat = (cat) => {
    pendingCatRef.current = cat;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  // 공유 링크 생성: 파일 + meta(원본명/카테고리) 같이 전송
  const handleShare = async () => {
    const selected = models.filter((m) => m.visible && m.opacity > 0);
    if (selected.length === 0) {
      alert("먼저 STL 파일을 업로드해주세요.");
      return;
    }

    const formData = new FormData();
    selected.forEach((m) => m.file && formData.append("files", m.file));

    const meta = selected.map((m) => ({
      originalName: m.name,
      category: m.category, // 대합치/보철물/T-BAR/GUM
    }));
    formData.append("meta", JSON.stringify(meta));

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

  const byCat = (cat) => models.filter((m) => m.category === cat);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 좌측 패널 */}
      <aside style={{ width: 360, padding: 16, overflowY: "auto", borderRight: "1px solid #eee" }}>
        <h2>STL 업로드</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={handleShare}>공유 링크 생성</button>
          <button onClick={onPickGeneral}>파일 추가</button>
        </div>

        {/* 숨김 input (공용) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl"
          multiple
          style={{ display: "none" }}
          onChange={handleFilesChosen}
        />

        {/* 카테고리 섹션 */}
        {CATS.map((cat) => {
          const list = byCat(cat);
          return (
            <section key={cat} style={{ marginTop: 18 }}>
              <h3 style={{ margin: "10px 0" }}>
                {CAT_LABEL[cat]} <span style={{ color: "#999" }}>({list.length})</span>
              </h3>
              <button style={{ marginBottom: 8 }} onClick={() => onPickByCat(cat)}>
                {CAT_LABEL[cat]} 파일 추가
              </button>

              {list.map((m) => (
                <div key={m.id} style={{ marginBottom: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={m.visible}
                      onChange={(e) =>
                        setModels((prev) =>
                          prev.map((x) => (x.id === m.id ? { ...x, visible: e.target.checked } : x))
                        )
                      }
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

                    {/* 카테고리 변경 → 즉시 색상 갱신 */}
                    <select
                      value={m.category}
                      onChange={(e) =>
                        setModels((prev) =>
                          prev.map((x) =>
                            x.id === m.id
                              ? { ...x, category: e.target.value, color: CAT_COLOR[e.target.value] }
                              : x
                          )
                        )
                      }
                    >
                      {CATS.map((c) => (
                        <option key={c} value={c}>
                          {CAT_LABEL[c]}
                        </option>
                      ))}
                    </select>

                    {/* 색상 미리보기 */}
                    <span
                      style={{
                        width: 20,
                        height: 12,
                        borderRadius: 3,
                        background: m.color,
                        border: "1px solid #ddd",
                        display: "inline-block",
                      }}
                      title={m.category}
                    />
                  </label>

                  {/* 투명도 */}
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 12, color: "#666" }}>투명도</div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={m.opacity}
                      onChange={(e) =>
                        setModels((prev) =>
                          prev.map((x) =>
                            x.id === m.id ? { ...x, opacity: Number(e.target.value) } : x
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

      {/* 우측 3D 뷰 */}
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stage>
            {models
              .filter((m) => m.visible && m.opacity > 0) // opacity 0 => 렌더 제외 (잔상 방지)
              .map((m) => (
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

/* ====================== 공유 페이지 ====================== */
function SharePage() {
  const { id } = useParams();
  // { url, category, color, visible, opacity }
  const [files, setFiles] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "조회 실패");

        const items = (data.files || []).map((f) => {
          const url =
            typeof f === "string" ? f : `${API_BASE}/uploads/${id}/${f.filename}`;
          const category = f.category || "보철물";
          const color = CAT_COLOR[category] || CAT_COLOR["보철물"];
          return { url, category, color, visible: true, opacity: 1 };
        });

        setFiles(items);
      } catch (e) {
        console.error(e);
        alert("공유된 파일을 불러오는 데 실패했습니다.");
      }
    })();
  }, [id]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 좌측: 파일명 숨기고 카테고리 pill + 색상바 + 토글/투명도 */}
      <aside style={{ width: 280, padding: 16, overflowY: "auto", borderRight: "1px solid #eee" }}>
        <h3>표시 / 투명도</h3>
        {files.map((f, idx) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            {/* 카테고리 pill */}
            <div
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                background: "#f5f5f5",
                border: "1px solid #ddd",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              {f.category}
            </div>

            {/* 표시 토글 + 색상바(파일명 대신) */}
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={f.visible}
                onChange={(e) =>
                  setFiles((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, visible: e.target.checked } : x))
                  )
                }
              />
              <span
                style={{
                  width: 140,
                  height: 10,
                  borderRadius: 4,
                  background: f.color,
                  display: "inline-block",
                }}
                title={f.category}
              />
            </label>

            {/* 투명도 */}
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
              .filter((f) => f.visible && f.opacity > 0) // opacity 0 => 렌더 제외 (잔상 방지)
              .map((f, idx) => (
                <Model key={idx} fileUrl={f.url} color={f.color} opacity={f.opacity} />
              ))}
          </Stage>
          <OrbitControls />
        </Canvas>
        <Loader />
      </div>
    </div>
  );
}

/* ====================== 라우팅 ====================== */
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
