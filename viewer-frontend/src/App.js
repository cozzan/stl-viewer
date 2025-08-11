import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Loader } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://stl-viewer-backend.onrender.com";

// 카테고리 상수
const CATS = ["UPPER", "LOWER", "BAR", "GUM"];
const CAT_LABEL = {
  UPPER: "UPPER",
  LOWER: "LOWER",
  BAR: "BAR",
  GUM: "GUM",
};

// 카테고리별 기본 색상
const CAT_COLOR = {
  UPPER: "#FFC107",
  LOWER: "#50C878",
  BAR: "#3F51B5",
  GUM: "#E57373",
};

// 3D 모델 로더
function Model({ fileUrl, color = "#FFD700", opacity = 1, position = [0, 0, 0] }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
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
        opacity,
        side: THREE.DoubleSide,
      }),
    [color, opacity]
  );

  if (!geometry) return null;
  return <mesh geometry={geometry} material={material} position={position} />;
}

// ======================== 업로드 페이지 ========================
function UploadPage() {
  const [models, setModels] = useState([]); // {id, name, url, opacity, visible, category, color}
  const upperInputRef = useRef(null);
  const lowerInputRef = useRef(null);
  const barInputRef = useRef(null);
  const gumInputRef = useRef(null);

  // 파일을 상태에 추가
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

  // 개별 카테고리 추가 버튼
  const clickUpper = () => upperInputRef.current?.click();
  const clickLower = () => lowerInputRef.current?.click();
  const clickBar = () => barInputRef.current?.click();
  const clickGum = () => gumInputRef.current?.click();

  // 🔹 메인 “파일 선택” 버튼: UPPER → LOWER → BAR → GUM 순서로 자동 열기
  //   취소(파일 미선택) 시에도 다음 카테고리로 자동 진행
  const handlePickInOrder = () => {
    const refsByCat = {
      UPPER: upperInputRef,
      LOWER: lowerInputRef,
      BAR: barInputRef,
      GUM: gumInputRef,
    };

    let idx = 0;

    const openNext = () => {
      if (idx >= CATS.length) return;

      const cat = CATS[idx];
      const ref = refsByCat[cat];
      const input = ref?.current;

      // 해당 카테고리 input이 없으면 바로 다음
      if (!input) {
        idx++;
        openNext();
        return;
      }

      // 같은 파일도 다시 선택 가능하도록 리셋
      input.value = "";

      // 정리 함수
      const cleanup = () => {
        input.removeEventListener("change", onChange);
        window.removeEventListener("focus", onFocus, true);
      };

      // 파일이 선택되면 다음 카테고리로
      const onChange = (e) => {
        try {
          addFiles(e.target.files, cat);
        } finally {
          cleanup();
          idx++;
          openNext();
        }
      };

      // 다이얼로그가 닫히고 포커스가 돌아왔는데 파일이 없으면(=취소) 다음으로
      const onFocus = () => {
        cleanup();
        if (!input.files || input.files.length === 0) {
          idx++;
          openNext();
        }
      };

      // 이벤트 바인딩
      input.addEventListener("change", onChange, { once: true });
      setTimeout(() => window.addEventListener("focus", onFocus, true), 0);

      // 파일 다이얼로그 열기 (몇몇 환경에서 차단될 수 있음)
      try {
        setTimeout(() => input.click(), 0);
      } catch (_) {
        console.log(`자동 파일 선택이 차단됨: ${cat}`);
      }
    };

    openNext();
  };

  // 공유 링크 생성
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
      console.log("서버 응답:", data);
      const shareId = data.shareId || data.id;
      if (!shareId) throw new Error("shareId 없음");
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

  const groupByCat = (cat) => models.filter((m) => m.category === cat);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 좌측 패널 */}
      <aside style={{ width: 360, padding: 16, overflowY: "auto", borderRight: "1px solid #eee" }}>
        <h2>STL 업로드</h2>

        {/* 🔹 메인 파일 선택(자동 순서 열기) + 공유 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handlePickInOrder}>파일 선택</button>
          <button onClick={handleShare}>공유 링크 생성</button>
        </div>

        {/* 숨김 input들 */}
        <input
          ref={upperInputRef}
          type="file"
          accept=".stl"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files, "UPPER")}
        />
        <input
          ref={lowerInputRef}
          type="file"
          accept=".stl"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files, "LOWER")}
        />
        <input
          ref={barInputRef}
          type="file"
          accept=".stl"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files, "BAR")}
        />
        <input
          ref={gumInputRef}
          type="file"
          accept=".stl"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files, "GUM")}
        />

        {/* 카테고리별 영역 */}
        {CATS.map((cat) => {
          const list = groupByCat(cat);
          return (
            <div key={cat} style={{ marginTop: 18 }}>
              <h3 style={{ margin: "10px 0" }}>
                {CAT_LABEL[cat]} <span style={{ color: "#999" }}>({list.length})</span>
              </h3>

              {/* 개별 카테고리 추가 버튼 */}
              <button
                onClick={
                  cat === "UPPER" ? clickUpper : cat === "LOWER" ? clickLower : cat === "BAR" ? clickBar : clickGum
                }
                style={{ marginBottom: 8 }}
              >
                {CAT_LABEL[cat]} 파일 추가
              </button>

              {list.map((m) => (
                <div key={m.id} style={{ marginBottom: 8 }}>
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
                        width: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.name}
                    </span>
                    <select
                      value={m.category}
                      onChange={(e) =>
                        setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, category: e.target.value } : x)))
                      }
                    >
                      {CATS.map((c) => (
                        <option key={c} value={c}>
                          {CAT_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </label>
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
                          prev.map((x) => (x.id === m.id ? { ...x, opacity: Number(e.target.value) } : x))
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
              .filter((m) => m.visible)
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

// ======================== 공유 페이지 ========================
function SharePage() {
  const { id } = useParams();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "조회 실패");
        const fileUrls = (data.files || []).map((f) =>
          typeof f === "string" ? f : `https://stl-viewer-backend.onrender.com/uploads/${f.filename}`
        );
        setFiles(fileUrls);
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
          {files.map((url, idx) => (
            <Model key={idx} fileUrl={url} />
          ))}
        </Stage>
        <OrbitControls />
      </Canvas>
      <Loader />
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
