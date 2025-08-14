// viewer-frontend/src/App.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Loader } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://stl-viewer-backend.onrender.com";

/** ---------- 카테고리 & 색상 ---------- */
const CATS = [
  { key: "OPPOSING", label: "대합치" },
  { key: "PROSTHESIS", label: "보철물" },
  { key: "TBAR", label: "T-BAR" },
  { key: "GUM", label: "GUM" },
];

const CAT_COLOR = {
  OPPOSING: "#E0C08C",   // 연한 황토색
  PROSTHESIS: "#FFD966", // 연한 금색
  TBAR: "#D0D0D0",       // 연한 회색
  GUM: "#F29A9A",        // 연한 붉은색
};

/** ---------- 공통 3D 모델 ---------- */
// opacity <= 0 이면 렌더 자체를 생략하여 '잔상' 완전히 제거
function Model({ fileUrl, color = "#FFD966", opacity = 1, position = [0, 0, 0] }) {
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

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.1,
        roughness: 0.75,
        transparent: true,
        opacity: Math.max(0, opacity),
        side: THREE.DoubleSide,
      }),
    [color, opacity]
  );

  if (!geometry) return null;
  if (opacity <= 0) return null; // <- 잔상 제거 핵심

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      castShadow={false}
      receiveShadow={false}
      visible={opacity > 0}
    />
  );
}

/** ======================== 업로드 페이지 ======================== */
function UploadPage() {
  // {id, name, file, url, opacity, visible, category, color}
  const [models, setModels] = useState([]);

  // 일반 “파일 추가” 버튼용 숨김 input
  const addAnyRef = useRef(null);

  // 카테고리별 개별 추가 버튼용 숨김 input
  const inputRefByCat = {
    OPPOSING: useRef(null),
    PROSTHESIS: useRef(null),
    TBAR: useRef(null),
    GUM: useRef(null),
  };

  // 파일을 state에 추가
  const addFiles = (fileList, categoryKey) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      file: f,
      url: URL.createObjectURL(f),
      opacity: 1,
      visible: true,
      category: categoryKey || "PROSTHESIS", // 기본값은 보철물
      color: CAT_COLOR[categoryKey || "PROSTHESIS"],
    }));
    setModels((prev) => [...prev, ...arr]);
  };

  // “파일 추가” (공유 버튼 옆) : 기본 카테고리 보철물로 추가
  const clickAddAny = () => addAnyRef.current?.click();

  // 카테고리별 개별 버튼
  const clickByCat = (key) => inputRefByCat[key].current?.click();

  const groupByCat = (key) => models.filter((m) => m.category === key);

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

        {/* 상단: 파일 추가 & 공유 링크 생성 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={clickAddAny}>파일 추가</button>
          <button
            onClick={async () => {
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
                try {
                  await navigator.clipboard.writeText(url);
                } catch (_) {}
              } catch (e) {
                console.error(e);
                alert("공유 링크 생성에 실패했습니다.");
              }
            }}
          >
            공유 링크 생성
          </button>
        </div>

        {/* 숨김 input: 일반 추가(보철물로 추가) */}
        <input
          ref={addAnyRef}
          type="file"
          accept=".stl"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files, "PROSTHESIS")}
        />

        {/* 숨김 input: 카테고리별 추가 */}
        {CATS.map(({ key }) => (
          <input
            key={key}
            ref={inputRefByCat[key]}
            type="file"
            accept=".stl"
            multiple
            style={{ display: "none" }}
            onChange={(e) => addFiles(e.target.files, key)}
          />
        ))}

        {/* 카테고리 섹션 */}
        {CATS.map(({ key, label }) => {
          const list = groupByCat(key);
          return (
            <div key={key} style={{ marginTop: 18 }}>
              <h3 style={{ margin: "10px 0" }}>
                {label} <span style={{ color: "#999" }}>({list.length})</span>
              </h3>

              {/* 카테고리 개별 추가 버튼 */}
              <button onClick={() => clickByCat(key)} style={{ marginBottom: 8 }}>
                {label} 파일 추가
              </button>

              {list.map((m) => (
                <div key={m.id} style={{ marginBottom: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                    />
                    <span
                      style={{
                        width: 170,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={m.name}
                    >
                      {m.name}
                    </span>

                    {/* 카테고리 드롭다운 (변경 시 색도 즉시 갱신) */}
                    <select
                      value={m.category}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setModels((prev) =>
                          prev.map((x) =>
                            x.id === m.id
                              ? { ...x, category: newCat, color: CAT_COLOR[newCat] }
                              : x
                          )
                        );
                      }}
                    >
                      {CATS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* 투명도 */}
                  <div style={{ marginTop: 4 }}>
                    <div>투명도:</div>
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
            </div>
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

/** ======================== 공유 페이지 ======================== */
function SharePage() {
  const { id } = useParams();
  // 공유페이지에서도 개별 on/off & 투명도 조절 (이름 표시 없음)
  const [items, setItems] = useState([]); // {id,url,visible,opacity,color}

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "조회 실패");
        const urls = (data.files || []).map((f) =>
          typeof f === "string"
            ? f
            : `https://stl-viewer-backend.onrender.com/uploads/${f.filename}`
        );
        // 기본은 보철물 색으로 초기화(요청사항: 이름은 표기 X)
        const init = urls.map((u, i) => ({
          id: `${i}`,
          url: u,
          visible: true,
          opacity: 1,
          color: CAT_COLOR.PROSTHESIS,
        }));
        setItems(init);
      } catch (e) {
        console.error(e);
        alert("공유된 파일을 불러오는 데 실패했습니다.");
      }
    })();
  }, [id]);

  return (
    <div style={{ height: "100vh" }}>
      {/* 좌상단 컨트롤 패널 */}
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          top: 12,
          left: 12,
          background: "rgba(255,255,255,0.95)",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 12,
          width: 280,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>표시 / 투명도</div>
        {items.map((it, i) => (
          <div key={it.id} style={{ marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={it.visible}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((x) =>
                      x.id === it.id ? { ...x, visible: e.target.checked } : x
                    )
                  )
                }
              />
              <span style={{ color: "#666" }}>Model {i + 1}</span>
            </label>
            <div style={{ marginTop: 4 }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={it.opacity}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((x) =>
                      x.id === it.id
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
      </div>

      <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Stage>
          {items
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
  );
}

/** ======================== 라우팅 ======================== */
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
