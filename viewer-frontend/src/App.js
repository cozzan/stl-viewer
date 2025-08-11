// viewer-frontend/src/App.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Loader } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://stl-viewer-backend.onrender.com";

/** ─────────────────────────────────────────────────────────────
 *  1) 파일명에서 카테고리 추정
 *     - 필요하면 키워드 추가/수정 가능
 * ───────────────────────────────────────────────────────────── */
const CATEGORY_KEYS = {
  upper: [/upper/i, /maxilla/i, /\bmx\b/i, /upp/i],
  lower: [/lower/i, /mandible/i, /\bmd\b/i, /low/i],
  bar: [/bar/i, /hybrid/i, /framework/i],
  gum: [/gum/i, /gingiva/i, /ging/i, /pink/i]
};
const CATEGORY_ORDER = ["upper", "lower", "bar", "gum"];

function guessCategory(filename = "") {
  for (const cat of CATEGORY_ORDER) {
    const rules = CATEGORY_KEYS[cat];
    if (rules.some((re) => re.test(filename))) return cat;
  }
  return "upper"; // 기본값: upper (원하면 'unknown'으로 두고 드롭다운에서 바꾸도록)
}

/** ─────────────────────────────────────────────────────────────
 *  2) STL 모델 컴포넌트
 * ───────────────────────────────────────────────────────────── */
function Model({ fileUrl, color = "#FFD700", opacity = 1, visible = true }) {
  const [geometry, setGeometry] = useState(null);
  useEffect(() => {
    const loader = new STLLoader();
    loader.load(fileUrl, (geo) => {
      geo.computeVertexNormals();
      setGeometry(geo);
    });
  }, [fileUrl]);

  if (!geometry || !visible) return null;

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.1,
    roughness: 0.75,
    transparent: true,
    opacity,
    side: THREE.DoubleSide
  });

  return <mesh geometry={geometry} material={material} />;
}

/** ─────────────────────────────────────────────────────────────
 *  3) 메인 컴포넌트
 *     - 파일 업로드 + 카테고리별 목록 + 3D 뷰
 * ───────────────────────────────────────────────────────────── */
export default function App() {
  const [models, setModels] = useState([]); // {id, name, url, file, visible, opacity, color, category}
  const [uploading, setUploading] = useState(false);

  /** 파일 선택 시 상태 구성 */
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const next = files.map((f, idx) => {
      const id = crypto.randomUUID?.() || `${Date.now()}-${idx}`;
      const url = URL.createObjectURL(f);
      return {
        id,
        name: f.name,
        url,
        file: f,
        visible: true,
        opacity: 1,
        color: "#FFD700",
        category: guessCategory(f.name) // ← 자동 분류
      };
    });

    // 기존 모델 뒤에 추가
    setModels((prev) => [...prev, ...next]);
  };

  /** 카테고리 변경 핸들러 */
  const changeCategory = (id, category) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, category } : m))
    );
  };

  /** 체크박스 on/off */
  const toggleVisible = (id) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m))
    );
  };

  /** 투명도 변경 */
  const changeOpacity = (id, value) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, opacity: value } : m))
    );
  };

  /** ─ 공유 링크 생성 (기존 로직 그대로) ─ */
  const handleShare = async () => {
    const formData = new FormData();
    models.forEach((m) => {
      if (m.file) formData.append("files", m.file);
    });

    try {
      setUploading(true);
      const res = await fetch(`${API_BASE}/api/share/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      const shareId = data.shareId || data.id;

      if (!res.ok || !shareId) {
        throw new Error(data?.message || data?.error || "업로드 실패");
      }

      const shareUrl = `${window.location.origin}/share/${shareId}`;
      alert(`공유 링크가 생성되었습니다:\n${shareUrl}`);
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {}
    } catch (err) {
      console.error("공유 링크 생성 실패:", err);
      alert("공유 링크 생성에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  /** 카테고리별로 묶어서 보여주기 위한 그룹 */
  const grouped = useMemo(() => {
    const g = { upper: [], lower: [], bar: [], gum: [] };
    for (const m of models) {
      const cat = CATEGORY_ORDER.includes(m.category) ? m.category : "upper";
      g[cat].push(m);
    }
    return g;
  }, [models]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 좌측 패널 */}
      <aside
        style={{
          width: 320,
          padding: "16px",
          borderRight: "1px solid #eee",
          overflowY: "auto"
        }}
      >
        <h2 style={{ marginTop: 0 }}>STL 업로드</h2>
        <input type="file" multiple accept=".stl" onChange={handleFiles} />
        <div style={{ height: 12 }} />

        {/* ───── 카테고리별 섹션 ───── */}
        {CATEGORY_ORDER.map((cat) => (
          <section key={cat} style={{ marginBottom: 18 }}>
            <h4 style={{ margin: "12px 0 8px" }}>
              {cat.toUpperCase()} ({grouped[cat].length})
            </h4>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {grouped[cat].map((m) => (
                <li key={m.id} style={{ marginBottom: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={m.visible}
                      onChange={() => toggleVisible(m.id)}
                    />
                    <span
                      title={m.name}
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {m.name}
                    </span>
                    {/* 카테고리 수동 변경 */}
                    <select
                      value={m.category}
                      onChange={(e) => changeCategory(m.id, e.target.value)}
                    >
                      {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>
                          {c.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* 투명도 슬라이더 */}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={m.opacity}
                    onChange={(e) => changeOpacity(m.id, Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </li>
              ))}

              {grouped[cat].length === 0 && (
                <li style={{ color: "#aaa" }}>파일 없음</li>
              )}
            </ul>
          </section>
        ))}

        <button onClick={handleShare} disabled={uploading || models.length === 0}>
          {uploading ? "업로드 중..." : "공유 링크 생성"}
        </button>
      </aside>

      {/* 우측 3D 뷰 */}
      <main style={{ flex: 1 }}>
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
                />
              ))}
          </Stage>
          <OrbitControls />
        </Canvas>
        <Loader />
      </main>
    </div>
  );
}
