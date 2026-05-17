import { useState, useRef, useEffect } from "react";

// ─── Konfigurasi Fitur ─────────────────────────────────────────────────────────
const FEATURES = [
  {
    key: "Engine_size",
    label: "Ukuran Mesin",
    unit: "L",
    min: 1.0,
    max: 8.0,
    step: 0.1,
    default: 3.0,
    icon: "⚙",
  },
  {
    key: "Horsepower",
    label: "Tenaga Kuda",
    unit: "HP",
    min: 55,
    max: 450,
    step: 1,
    default: 185,
    icon: "◈",
  },
  {
    key: "Wheelbase",
    label: "Jarak Sumbu Roda",
    unit: "in",
    min: 92,
    max: 139,
    step: 0.1,
    default: 107.5,
    icon: "↔",
  },
  {
    key: "Width",
    label: "Lebar Kendaraan",
    unit: "in",
    min: 62,
    max: 80,
    step: 0.1,
    default: 71.2,
    icon: "◁▷",
  },
  {
    key: "Length",
    label: "Panjang Kendaraan",
    unit: "in",
    min: 149,
    max: 225,
    step: 0.1,
    default: 187.3,
    icon: "▽△",
  },
  {
    key: "Curb_weight",
    label: "Berat Kendaraan",
    unit: "K lbs",
    min: 1.9,
    max: 5.6,
    step: 0.01,
    default: 3.35,
    icon: "◎",
  },
  {
    key: "Fuel_capacity",
    label: "Kapasitas Tangki",
    unit: "gal",
    min: 10,
    max: 32,
    step: 0.1,
    default: 17.0,
    icon: "▣",
  },
  {
    key: "Fuel_efficiency",
    label: "Efisiensi BBM",
    unit: "MPG",
    min: 15,
    max: 45,
    step: 1,
    default: 23,
    icon: "≋",
  },
];

const API_URL = "http://localhost:5000";

const AUTHOR = {
  nama: "Ikhwan Kurniawan Julianto",
  npm: "237006102",
};

function validateField(feature, raw) {
  if (raw === "" || raw === null || raw === undefined) return "Wajib diisi";
  const val = parseFloat(raw);
  if (isNaN(val)) return "Harus berupa angka";
  if (val < feature.min) return `Min: ${feature.min} ${feature.unit}`;
  if (val > feature.max) return `Max: ${feature.max} ${feature.unit}`;
  return null;
}

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
        <div style={s.headerInner}>
          <span style={s.brandDot} />
          <h1 style={s.brandName}>
            CAR PRICE<span style={s.brandAccent}> PREDICTION </span>
          </h1>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div style={s.main}>
        <div style={s.mainInner}>
          {/* Left: Form */}
          <div style={s.leftCol}>
            <div style={s.sectionLabel}>
              <span style={s.sectionNum}>01</span>
              <span style={s.sectionTitle}>SPESIFIKASI KENDARAAN</span>
            </div>

            <div style={s.fieldGrid}>
              {FEATURES.map((f, idx) => {
                const err = touched[f.key] ? errors[f.key] : null;
                const filled = values[f.key] !== "";
                const isOk = filled && !errors[f.key];
                return (
                  <div key={f.key} style={s.fieldWrap}>
                    <label style={s.label}>
                      <span style={s.labelSeq}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span style={s.labelIcon}>{f.icon}</span>
                      <span style={s.labelText}>{f.label}</span>
                      <span style={s.labelUnit}>{f.unit}</span>
                      {isOk && <span style={s.checkmark}>✓</span>}
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

            <div style={s.actionRow}>
              <button
                onClick={handleReset}
                style={s.resetBtn}
                className="reset-btn"
              >
                ↺ RESET
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ ...s.submitBtn, ...(loading ? s.submitDisabled : {}) }}
                className="submit-btn"
              >
                {loading ? (
                  <span style={s.spinner} />
                ) : (
                  <>
                    {" "}
                    RUN PREDICT <span style={s.submitArrow}>→</span>
                  </>
                )}
              </button>
            </div>

            {submitError && (
              <div style={s.errorBox}>
                <span>[ERR]</span>
                <span>{submitError}</span>
              </div>
            )}
          </div>

          {/* Right: Result */}
          <div style={s.rightCol} ref={resultRef}>
            <div style={s.sectionLabel}>
              <span style={s.sectionNum}>02</span>
              <span style={s.sectionTitle}>OUTPUT PREDIKSI</span>
            </div>

            {/* Price output */}
            <div style={s.priceCard}>
              <div style={s.priceTopBar}>
                <span style={s.priceTag}>ESTIMATED_PRICE</span>
                <span
                  style={{
                    ...s.statusDot,
                    background: result ? "#4ade80" : "#6b7280",
                  }}
                />
              </div>
              <div
                style={{ ...s.priceBox, ...(result ? s.priceBoxActive : {}) }}
              >
                <span style={s.priceValue}>
                  {result ? formatUSD(animPrice) : "$0.00"}
                </span>
              </div>
              {result ? (
                <p style={s.priceSub}>
                  ≈{" "}
                  <span style={s.priceSubVal}>
                    {result.prediction.price_thousands.toFixed(3)}K
                  </span>{" "}
                  USD
                </p>
              ) : (
                <p style={s.pricePlaceholder}>
                  &gt; awaiting input from form...
                </p>
              )}
            </div>

            {/* Spec summary */}
            {result && (
              <div style={s.summaryCard} className="fade-in">
                <div style={s.summaryHeader}>
                  <span style={s.summaryHeaderText}>SPEC_SUMMARY[]</span>
                </div>
                <div style={s.summaryGrid}>
                  {FEATURES.map((f) => (
                    <div key={f.key} style={s.summaryRow}>
                      <span style={s.summaryKey}>{f.key}</span>
                      <span style={s.summaryVal}>
                        {result.input[f.key]}
                        <span style={s.summaryUnit}> {f.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div style={s.metricRow}>
                  <div style={s.metricChip}>
                    <span style={{ ...s.metricVal, color: "#4ade80" }}>
                      {(result.model_info.r2_score * 100).toFixed(2)}%
                    </span>
                    <span style={s.metricLabel}>R²_SCORE</span>
                  </div>
                  <div style={s.metricChip}>
                    <span style={{ ...s.metricVal, color: "#fb923c" }}>
                      ±${(result.model_info.rmse_thousands * 1000).toFixed(0)}
                    </span>
                    <span style={s.metricLabel}>RMSE_ERR</span>
                  </div>
                  <div style={s.metricChip}>
                    <span
                      style={{ ...s.metricVal, color: "#38bdf8", fontSize: 9 }}
                    >
                      {result.model_info.model
                        ? result.model_info.model
                            .replace("Regressor", "")
                            .trim()
                        : "GB"}
                    </span>
                    <span style={s.metricLabel}>MODEL_ID</span>
                  </div>
                </div>
              </div>
            )}

            {/* Author */}
            <div style={s.authorCard}>
              <div style={s.authorHeader}>
                <span style={s.authorHeaderText}>AUTHOR_INFO</span>
              </div>
              <div style={s.authorBody}>
                <div style={s.authorRow}>
                  <span style={s.authorKey}>nama</span>
                  <span style={s.authorSep}>=</span>
                  <span style={s.authorVal}>"{AUTHOR.nama}"</span>
                </div>
                <div style={s.authorRow}>
                  <span style={s.authorKey}>npm&nbsp;</span>
                  <span style={s.authorSep}>=</span>
                  <span style={s.authorVal}>"{AUTHOR.npm}"</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0d0d0d",
  surface: "#111111",
  card: "#161616",
  cardBorder: "#252525",
  green: "#4ade80",
  greenDim: "#16a34a",
  greenGlow: "rgba(74,222,128,0.15)",
  yellow: "#facc15",
  orange: "#fb923c",
  red: "#f87171",
  blue: "#38bdf8",
  text: "#e5e7eb",
  textDim: "#6b7280",
  textMid: "#9ca3af",
  accent: "#a3e635",
  accentGlow: "rgba(163,230,53,0.2)",
};

const s = {
  page: {
    fontFamily: "'Courier New', 'Lucida Console', monospace",
    background: C.bg,
    minHeight: "100vh",
    color: C.text,
  },

  // Header
  header: {
    background: C.surface,
    borderBottom: `1px solid ${C.cardBorder}`,
    padding: "0 32px",
    height: 52,
    display: "flex",
    alignItems: "center",
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBrand: { display: "flex", alignItems: "center", gap: 10 },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: C.accent,
    boxShadow: `0 0 10px ${C.accentGlow}`,
  },
  brandName: { fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: 2 },
  brandAccent: { color: C.accent },
  headerNav: { display: "flex", alignItems: "center", gap: 28 },
  navItem: {
    fontSize: 11,
    color: C.textDim,
    letterSpacing: 1.5,
    cursor: "pointer",
  },
  navCta: {
    fontSize: 11,
    color: "#0d0d0d",
    background: C.accent,
    padding: "6px 14px",
    letterSpacing: 1.5,
    fontWeight: 700,
    cursor: "pointer",
  },

  // Hero
  hero: {
    background: C.surface,
    borderBottom: `1px solid ${C.cardBorder}`,
    padding: "56px 32px 40px",
  },
  heroInner: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    gap: 48,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  heroLeft: { flex: "1 1 380px" },
  heroTitle: {
    margin: "0 0 20px",
    fontSize: 68,
    fontWeight: 900,
    lineHeight: 1,
    color: "#fff",
    letterSpacing: -2,
    fontFamily: "'Courier New', monospace",
  },
  heroTitleMuted: { color: C.accent },
  heroSub: {
    margin: "0 0 28px",
    fontSize: 13,
    color: C.textMid,
    lineHeight: 1.7,
    maxWidth: 400,
  },
  progressWrap: { maxWidth: 360 },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { fontSize: 10, color: C.textDim, letterSpacing: 1.5 },
  progressPct: { fontSize: 10, color: C.accent, letterSpacing: 1 },
  progressTrack: {
    height: 3,
    background: "#222",
    borderRadius: 0,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: C.accent,
    transition: "width 0.4s ease",
    boxShadow: `0 0 8px ${C.accentGlow}`,
  },

  heroRight: { flex: "1 1 420px" },
  terminal: {
    background: "#0a0a0a",
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 6,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  terminalHeader: {
    background: "#1a1a1a",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 7,
    borderBottom: `1px solid ${C.cardBorder}`,
  },
  termDot: {
    width: 11,
    height: 11,
    borderRadius: "50%",
  },
  termTitle: {
    fontSize: 11,
    color: C.textDim,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  termBody: { padding: "14px 16px", minHeight: 120 },
  termLine: {
    fontSize: 12,
    lineHeight: 2,
    fontFamily: "'Courier New', monospace",
    letterSpacing: 0.2,
  },
  cursor: { animation: "blink 1s step-end infinite" },

  // Main
  main: { padding: "32px 32px 60px" },
  mainInner: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    gap: 32,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  leftCol: {
    flex: "1 1 520px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  rightCol: {
    flex: "1 1 320px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  sectionLabel: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  sectionNum: {
    fontSize: 10,
    color: C.accent,
    fontWeight: 700,
    letterSpacing: 2,
    border: `1px solid ${C.greenDim}`,
    padding: "2px 7px",
  },
  sectionTitle: { fontSize: 11, color: C.textDim, letterSpacing: 1.5 },

  // Fields
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1px",
    background: C.cardBorder,
    border: `1px solid ${C.cardBorder}`,
  },
  fieldWrap: {
    background: C.card,
    padding: "14px 16px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 10,
    fontWeight: 700,
    color: C.textDim,
    marginBottom: 7,
    letterSpacing: 0.5,
    flexWrap: "wrap",
  },
  labelSeq: { color: C.accent, fontSize: 9, minWidth: 16 },
  labelIcon: { fontSize: 12, color: C.textMid },
  labelText: { color: C.textMid, flex: 1 },
  labelUnit: { color: "#444", fontSize: 9 },
  checkmark: { color: C.green, fontSize: 10, marginLeft: "auto" },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    background: "#0d0d0d",
    border: `1px solid #2a2a2a`,
    borderRadius: 0,
    fontSize: 15,
    fontWeight: 700,
    color: C.accent,
    fontFamily: "'Courier New', monospace",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    letterSpacing: 0.5,
  },
  inputError: {
    borderColor: C.red,
    color: C.red,
    boxShadow: `0 0 0 2px rgba(248,113,113,0.1)`,
  },
  inputOk: {
    borderColor: C.greenDim,
    boxShadow: `0 0 0 2px rgba(74,222,128,0.08)`,
  },
  errMsg: {
    margin: "4px 0 0",
    fontSize: 9,
    color: C.red,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  hintMsg: {
    margin: "4px 0 0",
    fontSize: 9,
    color: "#3a3a3a",
    lineHeight: 1.5,
  },

  actionRow: { display: "flex", gap: 8 },
  resetBtn: {
    padding: "12px 20px",
    background: "transparent",
    border: `1px solid #2a2a2a`,
    color: C.textDim,
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
    borderRadius: 0,
  },
  submitBtn: {
    flex: 1,
    padding: "12px 0",
    background: C.accent,
    border: "none",
    color: "#0d0d0d",
    fontFamily: "'Courier New', monospace",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 2,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow: `0 0 24px ${C.accentGlow}`,
    borderRadius: 0,
  },
  submitArrow: { fontSize: 16 },
  submitDisabled: { opacity: 0.4, cursor: "not-allowed" },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(0,0,0,0.3)",
    borderTop: "2px solid #0d0d0d",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: "rgba(248,113,113,0.06)",
    border: `1px solid rgba(248,113,113,0.3)`,
    padding: "12px 14px",
    fontSize: 11,
    color: C.red,
    lineHeight: 1.6,
    letterSpacing: 0.3,
  },

  // Right col
  priceCard: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    padding: "20px",
  },
  priceTopBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  priceTag: { fontSize: 9, color: C.textDim, letterSpacing: 2 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    transition: "background 0.4s",
  },
  priceBox: {
    background: "#0a0a0a",
    border: `1px solid #222`,
    padding: "16px 10px",
    textAlign: "center",
    marginBottom: 10,
    transition: "all 0.4s",
  },
  priceBoxActive: {
    border: `1px solid ${C.greenDim}`,
    boxShadow: `0 0 30px ${C.greenGlow}`,
  },
  priceValue: {
    fontSize: 34,
    fontWeight: 900,
    color: C.green,
    fontFamily: "'Courier New', monospace",
    letterSpacing: -0.5,
    textShadow: `0 0 20px ${C.greenGlow}`,
  },
  priceSub: { margin: 0, fontSize: 10, color: C.textDim, letterSpacing: 1 },
  priceSubVal: { color: C.green },
  pricePlaceholder: {
    margin: 0,
    fontSize: 11,
    color: "#333",
    letterSpacing: 0.3,
  },

  summaryCard: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    overflow: "hidden",
  },
  summaryHeader: {
    background: "#0f0f0f",
    borderBottom: `1px solid ${C.cardBorder}`,
    padding: "8px 14px",
  },
  summaryHeaderText: { fontSize: 9, color: C.textDim, letterSpacing: 2 },
  summaryGrid: { padding: "4px 0" },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 14px",
    borderBottom: `1px solid #191919`,
    gap: 8,
  },
  summaryKey: { fontSize: 10, color: C.textDim, flex: 1 },
  summaryVal: {
    fontSize: 12,
    fontWeight: 700,
    color: C.accent,
    fontFamily: "monospace",
  },
  summaryUnit: { fontSize: 9, color: "#444", fontWeight: 400 },

  metricRow: { display: "flex", borderTop: `1px solid ${C.cardBorder}` },
  metricChip: {
    flex: 1,
    background: "#0f0f0f",
    borderRight: `1px solid ${C.cardBorder}`,
    padding: "10px 6px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  metricVal: { fontWeight: 900, fontSize: 12, fontFamily: "monospace" },
  metricLabel: { fontSize: 8, color: "#333", letterSpacing: 1 },

  authorCard: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    overflow: "hidden",
  },
  authorHeader: {
    background: "#0f0f0f",
    borderBottom: `1px solid ${C.cardBorder}`,
    padding: "8px 14px",
  },
  authorHeaderText: { fontSize: 9, color: C.textDim, letterSpacing: 2 },
  authorBody: {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  authorRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12 },
  authorKey: { color: C.blue },
  authorSep: { color: C.textDim },
  authorVal: { color: C.yellow },
};

const css = `
  .dot-red { background: #ff5f57 !important; }
  .dot-yellow { background: #febc2e !important; }
  .dot-green { background: #28c840 !important; }

  .field-input:focus {
    border-color: #a3e635 !important;
    box-shadow: 0 0 0 2px rgba(163,230,53,0.12) !important;
    background: #111 !important;
  }
  .field-input::-webkit-outer-spin-button,
  .field-input::-webkit-inner-spin-button { -webkit-appearance: inner-spin-button; opacity: 0.3; }

  .submit-btn:hover:not(:disabled) {
    background: #bef264 !important;
    box-shadow: 0 0 36px rgba(163,230,53,0.35) !important;
  }
  .reset-btn:hover {
    border-color: #3a3a3a !important;
    color: #9ca3af !important;
  }

  .fade-in { animation: fadeIn 0.5s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }

  /* Scanline effect on hero */
  section::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.03) 2px,
      rgba(0,0,0,0.03) 4px
    );
  }
`;
