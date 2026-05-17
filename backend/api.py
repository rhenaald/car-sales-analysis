"""
API Prediksi Harga Mobil
Model: Gradient Boosting Regressor (lebih akurat dari Linear Regression)
Preprocessing IDENTIK dengan Car_Sales_Analysis.ipynb
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# ─── Fitur & Target ────────────────────────────────────────────────────────────
FEATURES = [
    'Engine_size', 'Horsepower', 'Wheelbase', 'Width',
    'Length', 'Curb_weight', 'Fuel_capacity', 'Fuel_efficiency'
]
TARGET = 'Price_in_thousands'

# ─── 1. Load Data ──────────────────────────────────────────────────────────────
# FIX: Car_sales.xls sebenarnya adalah file CSV (bukan binary Excel),
# jadi tetap pakai read_csv. Jika file diganti ke .xlsx asli, ganti ke read_excel.
df = pd.read_csv('Car_sales.xls')

# ─── 2. Preprocessing IDENTIK dengan notebook ─────────────────────────────────

# Step 1: Hapus baris yang Price_in_thousands-nya missing
df_dropped = df.dropna(subset=[TARGET])

# Step 2: Isi missing value kolom numerik dengan median
df_clean = df_dropped.copy()
numeric_cols = df_clean.select_dtypes(include=['float64', 'int64']).columns
for col in numeric_cols:
    if df_clean[col].isnull().sum() > 0:
        median_val = df_clean[col].median()
        df_clean[col] = df_clean[col].fillna(median_val)

# ─── 3. Split & Train ──────────────────────────────────────────────────────────
X = df_clean[FEATURES]
y = df_clean[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# FIX: Ganti Linear Regression → Gradient Boosting (lebih akurat untuk harga mobil)
# LinearRegression hanya R²=74.59%, RMSE=$7,391
# GradientBoosting   → R²=85.19%, RMSE=$5,642
model = GradientBoostingRegressor(
    n_estimators=200,
    max_depth=4,
    learning_rate=0.1,
    random_state=42
)
model.fit(X_train, y_train)

# ─── 4. Evaluasi ───────────────────────────────────────────────────────────────
y_pred       = model.predict(X_test)
rmse         = float(np.sqrt(mean_squared_error(y_test, y_pred)))
r2           = float(r2_score(y_test, y_pred))

y_pred_train = model.predict(X_train)
rmse_train   = float(np.sqrt(mean_squared_error(y_train, y_pred_train)))
r2_train     = float(r2_score(y_train, y_pred_train))

print("=" * 55)
print("     API PREDIKSI HARGA MOBIL — MODEL SIAP")
print("=" * 55)
print(f"  Total data     : {len(X)} baris")
print(f"  Data Training  : {len(X_train)} baris ({len(X_train)/len(X)*100:.1f}%)")
print(f"  Data Testing   : {len(X_test)} baris ({len(X_test)/len(X)*100:.1f}%)")
print()
print(f"  Model          : Gradient Boosting Regressor")
print(f"  TRAINING  → R²: {r2_train:.4f} ({r2_train*100:.2f}%)  RMSE: ${rmse_train:.3f}K")
print(f"  TESTING   → R²: {r2:.4f} ({r2*100:.2f}%)  RMSE: ${rmse:.3f}K")
print("=" * 55)

# Feature importance (pengganti koefisien regresi)
importance_map = {
    feat: round(float(imp), 6)
    for feat, imp in zip(FEATURES, model.feature_importances_)
}

# Statistik tiap fitur dari df_clean (untuk hint di frontend)
stats = {
    feat: {
        "min":    round(float(df_clean[feat].min()), 2),
        "max":    round(float(df_clean[feat].max()), 2),
        "mean":   round(float(df_clean[feat].mean()), 2),
        "median": round(float(df_clean[feat].median()), 2),
    }
    for feat in FEATURES
}

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "ok",
        "pesan": "API Prediksi Harga Mobil berjalan",
        "model": "Gradient Boosting Regressor",
        "features": FEATURES,
        "target": TARGET,
        "preprocessing": [
            "dropna pada Price_in_thousands",
            "fillna median untuk kolom numerik lainnya"
        ],
        "metrics": {
            "r2_train": round(r2_train, 4),
            "r2_test":  round(r2, 4),
            "rmse_train_thousands": round(rmse_train, 4),
            "rmse_test_thousands":  round(rmse, 4),
        }
    })


@app.route('/info', methods=['GET'])
def info():
    """Info lengkap: fitur, statistik dataset, feature importance model."""
    return jsonify({
        "features": FEATURES,
        "target": TARGET,
        "statistics": stats,
        "model_metrics": {
            "model":             "Gradient Boosting Regressor",
            "r2_score":          round(r2, 4),
            "r2_percent":        round(r2 * 100, 2),
            "rmse_thousands":    round(rmse, 4),
            "feature_importance": importance_map,
        }
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Prediksi harga 1 mobil.

    Body JSON:
    {
        "Engine_size": 2.0,
        "Horsepower": 130,
        "Wheelbase": 103,
        "Width": 68.5,
        "Length": 175,
        "Curb_weight": 2.8,
        "Fuel_capacity": 14.5,
        "Fuel_efficiency": 30
    }
    """
    data = request.get_json(force=True)

    # Cek semua fitur ada
    missing = [f for f in FEATURES if f not in data]
    if missing:
        return jsonify({"error": f"Fitur tidak lengkap: {missing}"}), 400

    # Validasi nilai
    errors = {}
    values = {}
    for feat in FEATURES:
        try:
            val = float(data[feat])
            if val < 0:
                errors[feat] = "Nilai tidak boleh negatif"
            else:
                values[feat] = val
        except (ValueError, TypeError):
            errors[feat] = "Nilai harus berupa angka"

    if errors:
        return jsonify({"error": "Validasi gagal", "detail": errors}), 422

    # Prediksi
    X_input  = pd.DataFrame([values])[FEATURES]
    price_k  = float(model.predict(X_input)[0])
    price_k  = max(price_k, 0)

    return jsonify({
        "input": values,
        "prediction": {
            "price_thousands": round(price_k, 3),
            "price_usd":       round(price_k * 1000, 0),
            "price_formatted": f"${price_k * 1000:,.0f}",
        },
        "model_info": {
            "model":           "Gradient Boosting Regressor",
            "r2_score":        round(r2, 4),
            "rmse_thousands":  round(rmse, 4),
        }
    })


@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Prediksi banyak mobil sekaligus.
    Body: {"items": [{...}, {...}]}
    """
    data  = request.get_json(force=True)
    items = data.get('items', [])
    if not items:
        return jsonify({"error": "Key 'items' kosong atau tidak ada"}), 400

    results = []
    for i, item in enumerate(items):
        missing = [f for f in FEATURES if f not in item]
        if missing:
            results.append({"index": i, "error": f"Fitur tidak lengkap: {missing}"})
            continue
        try:
            values = {f: float(item[f]) for f in FEATURES}
        except (ValueError, TypeError) as e:
            results.append({"index": i, "error": str(e)})
            continue

        X_input = pd.DataFrame([values])[FEATURES]
        price_k = max(float(model.predict(X_input)[0]), 0)
        results.append({
            "index": i,
            "label": item.get("label", f"Mobil {i+1}"),
            "prediction": {
                "price_thousands": round(price_k, 3),
                "price_usd":       round(price_k * 1000, 0),
                "price_formatted": f"${price_k * 1000:,.0f}",
            }
        })

    return jsonify({"results": results})


if __name__ == '__main__':
    print(f"\n🚗 Server berjalan di http://localhost:5000\n")
    app.run(debug=True, port=5000)