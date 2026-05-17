import { useState, useRef, useEffect } from "react";

// ─── Konfigurasi Fitur ─────────────────────────────────────────────────────────
// Range disesuaikan data aktual Car_sales + default = nilai median dataset
const FEATURES = [
  {
    key: "Engine_size",
    label: "Ukuran Mesin",
    unit: "L",
    min: 1.0,
    max: 8.0,
    step: 0.1,
    default: 3.0,
    icon: "⚙️",
    desc: "Volume silinder mesin (Liter). Dataset: 1.0 – 8.0 L",
  },
  {
    key: "Horsepower",
    label: "Tenaga Kuda",
    unit: "HP",
    min: 55,
    max: 450,
    step: 1,
    default: 185,
    icon: "🐎",
    desc: "Daya mesin dalam Horsepower. Dataset: 55 – 450 HP",
  },
  {
    key: "Wheelbase",
    label: "Jarak Sumbu Roda",
    unit: "in",
    min: 92,
    max: 139,
    step: 0.1,
    default: 107.5,
    icon: "📏",
    desc: "Jarak antara as roda depan & belakang (inci). Dataset: 92.6 – 138.7 in",
  },
  {
    key: "Width",
    label: "Lebar Kendaraan",
    unit: "in",
    min: 62,
    max: 80,
    step: 0.1,
    default: 71.2,
    icon: "↔️",
    desc: "Lebar bodi kendaraan (inci). Dataset: 62.6 – 79.9 in",
  },
  {
    key: "Length",
    label: "Panjang Kendaraan",
    unit: "in",
    min: 149,
    max: 225,
    step: 0.1,
    default: 187.3,
    icon: "↕️",
    desc: "Panjang total kendaraan (inci). Dataset: 149.4 – 224.5 in",
  },
  {
    key: "Curb_weight",
    label: "Berat Kendaraan",
    unit: "K lbs",
    min: 1.9,
    max: 5.6,
    step: 0.01,
    default: 3.35,
    icon: "⚖️",
    desc: "Berat kendaraan (ribu pound). Dataset: 1.9 – 5.6 K lbs",
  },
  {
    key: "Fuel_capacity",
    label: "Kapasitas Tangki",
    unit: "gal",
    min: 10,
    max: 32,
    step: 0.1,
    default: 17.0,
    icon: "⛽",
    desc: "Kapasitas tangki BBM (galon). Dataset: 10.3 – 32.0 gal",
  },
  {
    key: "Fuel_efficiency",
    label: "Efisiensi BBM",
    unit: "MPG",
    min: 15,
    max: 45,
    step: 1,
    default: 23,
    icon: "🌿",
    desc: "Konsumsi BBM (mil per galon). Dataset: 15 – 45 MPG",
  },
];

const API_URL = "http://localhost:5000";

const AUTHOR = {
  nama: "Nama Mahasiswa",
  npm: "NPM / NIM",
};

// ─── Validasi per-field ────────────────────────────────────────────────────────
function validateField(feature, raw) {
  if (raw === "" || raw === null || raw === undefined) return "Wajib diisi";
  const val = parseFloat(raw);
  if (isNaN(val)) return "Harus berupa angka";
  if (val < feature.min) return `Min: ${feature.min} ${feature.unit}`;
  if (val > feature.max) return `Max: ${feature.max} ${feature.unit}`;
  return null;
}

// ─── Komponen Utama ────────────────────────────────────────────────────────────
export default function PrediksiHargaMobil() {
  const [values, setValues] = useState(
    Object.fromEntries(FEATURES.map((f) => [f.key, String(f.default)])),
  );
  const [touched, setTouched] = useState(
    Object.fromEntries(FEATURES.map((f) => [f.key, false])),
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [animPrice, setAnimPrice] = useState(0);
  const prevPrice = useRef(0);
  const resultRef = useRef(null);

  // Animasi harga
  useEffect(() => {
    if (!result) return;
    const target = result.prediction.price_usd;
    const start = prevPrice.current;
    const duration = 900;
    const startTime = performance.now();
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setAnimPrice(Math.round(start + (target - start) * ease));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prevPrice.current = target;
    setTimeout(
      () =>
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100,
    );
  }, [result]);

  const errors = Object.fromEntries(
    FEATURES.map((f) => [f.key, validateField(f, values[f.key])]),
  );
  const hasErrors = Object.values(errors).some(Boolean);

  const handleChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setSubmitError(null);
    setResult(null);
  };

  const handleBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleSubmit = async () => {
    setTouched(Object.fromEntries(FEATURES.map((f) => [f.key, true])));
    if (hasErrors) return;

    setLoading(true);
    setSubmitError(null);
    setResult(null);

    const payload = Object.fromEntries(
      FEATURES.map((f) => [f.key, parseFloat(values[f.key])]),
    );

    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendapat prediksi");
      setResult(data);
    } catch (err) {
      setSubmitError(
        err.message.includes("fetch")
          ? "Tidak bisa terhubung ke API. Pastikan server Python sudah berjalan di port 5000."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setValues(
      Object.fromEntries(FEATURES.map((f) => [f.key, String(f.default)])),
    );
    setTouched(Object.fromEntries(FEATURES.map((f) => [f.key, false])));
    setResult(null);
    setSubmitError(null);
  };

  const formatUSD = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const filledCount = FEATURES.filter(
    (f) => values[f.key] !== "" && values[f.key] !== null,
  ).length;
  const progress = Math.round((filledCount / FEATURES.length) * 100);

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerContent}>
          <div style={s.headerLeft}>
            <span style={s.headerCar}>🚗</span>
            <div>
              <h1 style={s.title}>PREDIKSI HARGA MOBIL</h1>
              <p style={s.subtitle}>
                Masukkan spesifikasi kendaraan untuk estimasi harga
              </p>
            </div>
          </div>
          <div style={s.progressWrap}>
            <span style={s.progressLabel}>
              {filledCount}/{FEATURES.length} kolom terisi
            </span>
            <div style={s.progressTrack}>
              <div style={{ ...s.progressBar, width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div style={s.body}>
        {/* ── Kolom Kiri: Form ── */}
        <div style={s.leftCol}>
          <div style={s.card}>
            <p style={s.cardTitle}>🔧 Spesifikasi Kendaraan</p>
            <p style={s.cardHint}>
              Isi semua kolom dengan nilai numerik yang sesuai, lalu tekan{" "}
              <strong>Hitung Harga Mobil</strong>.
            </p>

            <div style={s.fieldGrid}>
              {FEATURES.map((f) => {
                const err = touched[f.key] ? errors[f.key] : null;
                const filled = values[f.key] !== "";
                const isOk = filled && !errors[f.key];
                return (
                  <div key={f.key} style={s.fieldWrap}>
                    <label style={s.label}>
                      <span style={s.labelIcon}>{f.icon}</span>
                      {f.label}
                      <span style={s.labelUnit}>({f.unit})</span>
                      <span style={s.required}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step={f.step}
                        min={f.min}
                        max={f.max}
                        value={values[f.key]}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        onBlur={() => handleBlur(f.key)}
                        style={{
                          ...s.input,
                          ...(err ? s.inputError : {}),
                          ...(isOk ? s.inputOk : {}),
                        }}
                        className="field-input"
                      />
                    </div>
                    {err ? (
                      <p style={s.errMsg}>⚠ {err}</p>
                    ) : (
                      <p style={s.hintMsg}>{f.desc}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tombol aksi */}
          <div style={s.actionRow}>
            <button
              onClick={handleReset}
              style={s.resetBtn}
              className="reset-btn"
            >
              ↺ Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...s.submitBtn,
                ...(loading ? s.submitDisabled : {}),
              }}
              className="submit-btn"
            >
              {loading ? <span style={s.spinner} /> : "Hitung Harga Mobil →"}
            </button>
          </div>

          {submitError && (
            <div style={s.errorBox}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>❌</span>
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* ── Kolom Kanan: Hasil ── */}
        <div style={s.rightCol} ref={resultRef}>
          {/* Box harga */}
          <div style={s.priceCard}>
            <p style={s.priceCardLabel}>PERKIRAAN HARGA MOBIL</p>
            <div
              style={{
                ...s.priceBox,
                ...(result ? s.priceBoxActive : {}),
              }}
            >
              <span style={s.priceValue}>
                {result ? formatUSD(animPrice) : "$0"}
              </span>
            </div>
            {result ? (
              <p style={s.priceSub}>
                ≈ ${result.prediction.price_thousands.toFixed(3)}K
              </p>
            ) : (
              <p style={s.pricePlaceholder}>
                Isi form di sebelah kiri, lalu tekan{" "}
                <strong>Hitung Harga Mobil</strong>
              </p>
            )}
          </div>

          {/* Ringkasan spesifikasi */}
          {result && (
            <div style={s.summaryCard} className="fade-in">
              <p style={s.cardTitle}>📋 Ringkasan Spesifikasi</p>
              <div style={s.summaryGrid}>
                {FEATURES.map((f) => (
                  <div key={f.key} style={s.summaryRow}>
                    <span style={s.summaryIcon}>{f.icon}</span>
                    <span style={s.summaryLabel}>{f.label}</span>
                    <span style={s.summaryVal}>
                      {result.input[f.key]}{" "}
                      <span style={s.summaryUnit}>{f.unit}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div style={s.metricRow}>
                <div style={s.metricChip}>
                  <span style={{ ...s.metricVal, color: "#16a34a" }}>
                    {(result.model_info.r2_score * 100).toFixed(2)}%
                  </span>
                  <span style={s.metricLabel}>R² Score</span>
                </div>
                <div style={s.metricChip}>
                  <span style={{ ...s.metricVal, color: "#b45309" }}>
                    ±${(result.model_info.rmse_thousands * 1000).toFixed(0)}
                  </span>
                  <span style={s.metricLabel}>Margin Error</span>
                </div>
                {/* FIX: Tampilkan nama model yang benar dari API response */}
                <div style={s.metricChip}>
                  <span
                    style={{ ...s.metricVal, color: "#1d4ed8", fontSize: 10 }}
                  >
                    {result.model_info.model
                      ? result.model_info.model.replace("Regressor", "").trim()
                      : "GB"}
                  </span>
                  <span style={s.metricLabel}>Model</span>
                </div>
              </div>
            </div>
          )}

          {/* Identitas pembuat */}
          <div style={s.authorCard}>
            <p style={s.authorTitle}>SISTEM INI DIBUAT OLEH:</p>
            <p style={s.authorLine}>
              <span style={s.authorKey}>NAMA :</span> {AUTHOR.nama}
            </p>
            <p style={s.authorLine}>
              <span style={s.authorKey}>NPM&nbsp;&nbsp;:</span> {AUTHOR.npm}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#f1f5f9",
  card: "#ffffff",
  accent: "#1d4ed8",
  accentDark: "#1e3a8a",
  text: "#1e293b",
  muted: "#64748b",
  border: "#e2e8f0",
  ok: "#16a34a",
  okLight: "#dcfce7",
  err: "#dc2626",
  errLight: "#fee2e2",
  yellow: "#f59e0b",
  yellowLight: "#fef3c7",
};

const s = {
  page: {
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    background: C.bg,
    minHeight: "100vh",
    color: C.text,
  },
  header: {
    background: `linear-gradient(135deg, ${C.accentDark}, ${C.accent})`,
    padding: "18px 28px",
    boxShadow: "0 4px 24px rgba(30,58,138,0.25)",
  },
  headerContent: {
    maxWidth: 1080,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14, flex: 1 },
  headerCar: { fontSize: 38 },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
    color: "#fff",
    letterSpacing: 1,
    fontFamily: "'Courier New', monospace",
  },
  subtitle: {
    margin: "2px 0 0",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  progressWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 150,
  },
  progressLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    textAlign: "right",
  },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    background: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 99,
    background: "#4ade80",
    transition: "width 0.3s ease",
  },

  body: {
    display: "flex",
    gap: 20,
    padding: "20px 28px 40px",
    maxWidth: 1080,
    margin: "0 auto",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  leftCol: {
    flex: "1 1 480px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  rightCol: {
    flex: "1 1 320px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  card: {
    background: C.card,
    borderRadius: 16,
    padding: "20px 22px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
    border: `1px solid ${C.border}`,
  },
  cardTitle: {
    margin: "0 0 4px",
    fontWeight: 800,
    fontSize: 13,
    color: C.text,
  },
  cardHint: { margin: "0 0 16px", fontSize: 12, color: C.muted },

  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px 18px",
  },
  fieldWrap: {},
  label: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 700,
    color: C.text,
    marginBottom: 5,
    flexWrap: "wrap",
  },
  labelIcon: { fontSize: 13 },
  labelUnit: { color: C.muted, fontWeight: 400, fontSize: 11 },
  required: { color: C.err, fontSize: 13, marginLeft: 1 },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 11px 9px 11px",
    borderRadius: 9,
    border: `1.5px solid ${C.border}`,
    fontSize: 14,
    fontWeight: 600,
    color: C.text,
    background: "#f8fafc",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  inputError: {
    borderColor: C.err,
    background: C.errLight,
    boxShadow: `0 0 0 3px rgba(220,38,38,0.12)`,
  },
  inputOk: {
    borderColor: C.ok,
    background: C.okLight,
  },
  checkmark: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: C.ok,
    fontWeight: 900,
    fontSize: 14,
    pointerEvents: "none",
  },
  errMsg: { margin: "3px 0 0", fontSize: 10, color: C.err, fontWeight: 600 },
  hintMsg: { margin: "3px 0 0", fontSize: 10, color: C.muted, lineHeight: 1.4 },

  actionRow: { display: "flex", gap: 10 },
  resetBtn: {
    padding: "12px 20px",
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    background: C.card,
    color: C.muted,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  submitBtn: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 10,
    border: "none",
    background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
    color: "#fff",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 4px 18px rgba(29,78,216,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    letterSpacing: 0.3,
  },
  submitDisabled: { opacity: 0.55, cursor: "not-allowed" },
  spinner: {
    width: 18,
    height: 18,
    border: "3px solid rgba(255,255,255,0.3)",
    borderTop: "3px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: C.errLight,
    border: `1px solid #fca5a5`,
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 13,
    color: C.err,
    lineHeight: 1.5,
  },

  /* kolom kanan */
  priceCard: {
    background: C.card,
    borderRadius: 16,
    padding: "20px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
    border: `1px solid ${C.border}`,
    textAlign: "center",
  },
  priceCardLabel: {
    margin: "0 0 12px",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: C.muted,
  },
  priceBox: {
    background: "#f1f5f9",
    border: `2px solid ${C.border}`,
    borderRadius: 12,
    padding: "18px 10px",
    marginBottom: 8,
    transition: "all 0.4s",
  },
  priceBoxActive: {
    background: C.yellowLight,
    border: `2px solid ${C.yellow}`,
    boxShadow: "0 4px 20px rgba(245,158,11,0.2)",
  },
  priceValue: {
    fontSize: 36,
    fontWeight: 900,
    color: "#78350f",
    fontFamily: "'Courier New', monospace",
    letterSpacing: -1,
  },
  priceSub: { margin: 0, fontSize: 12, color: C.muted },
  pricePlaceholder: {
    margin: 0,
    fontSize: 12,
    color: C.muted,
    lineHeight: 1.5,
  },

  summaryCard: {
    background: C.card,
    borderRadius: 16,
    padding: "16px 18px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
    border: `1px solid ${C.border}`,
  },
  summaryGrid: { display: "flex", flexDirection: "column" },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 0",
    borderBottom: `1px solid ${C.border}`,
    fontSize: 12,
  },
  summaryIcon: { fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 },
  summaryLabel: { color: C.muted, flex: 1 },
  summaryVal: {
    fontWeight: 800,
    color: C.text,
    fontFamily: "monospace",
    fontSize: 13,
  },
  summaryUnit: { fontWeight: 400, color: C.muted, fontSize: 10 },

  metricRow: { display: "flex", gap: 8, marginTop: 14 },
  metricChip: {
    flex: 1,
    background: "#f8fafc",
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "8px 6px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  metricVal: { fontWeight: 900, fontSize: 14, fontFamily: "monospace" },
  metricLabel: {
    fontSize: 9,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  authorCard: {
    background: "#eff6ff",
    border: `1px solid #bfdbfe`,
    borderRadius: 14,
    padding: "14px 18px",
    textAlign: "center",
  },
  authorTitle: {
    margin: "0 0 8px",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: C.accent,
  },
  authorLine: { margin: "3px 0", fontSize: 13, color: C.text },
  authorKey: { fontWeight: 800 },
};

const css = `
  .field-input:focus {
    border-color: #1d4ed8 !important;
    box-shadow: 0 0 0 3px rgba(29,78,216,0.15) !important;
    background: #fff !important;
  }
  .field-input::-webkit-outer-spin-button,
  .field-input::-webkit-inner-spin-button { -webkit-appearance: inner-spin-button; opacity: 1; }
  .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .reset-btn:hover { background: #f1f5f9 !important; color: #1e293b !important; }
  .fade-in { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
