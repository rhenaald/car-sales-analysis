from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import os, warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

FEATURES = [
    'Engine_size', 'Horsepower', 'Wheelbase', 'Width',
    'Length', 'Curb_weight', 'Fuel_capacity', 'Fuel_efficiency'
]
TARGET = 'Price_in_thousands'

# ✅ FIX: path absolut agar bisa dibaca di Vercel
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'Car_sales.xls')

df = pd.read_csv(DATA_PATH)

df_dropped = df.dropna(subset=[TARGET])
df_clean = df_dropped.copy()
numeric_cols = df_clean.select_dtypes(include=['float64', 'int64']).columns
for col in numeric_cols:
    if df_clean[col].isnull().sum() > 0:
        df_clean[col] = df_clean[col].fillna(df_clean[col].median())

X = df_clean[FEATURES]
y = df_clean[TARGET]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = GradientBoostingRegressor(n_estimators=200, max_depth=4, learning_rate=0.1, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
r2   = float(r2_score(y_test, y_pred))

y_pred_train = model.predict(X_train)
rmse_train   = float(np.sqrt(mean_squared_error(y_train, y_pred_train)))
r2_train     = float(r2_score(y_train, y_pred_train))

importance_map = {f: round(float(i), 6) for f, i in zip(FEATURES, model.feature_importances_)}
stats = {
    feat: {
        "min": round(float(df_clean[feat].min()), 2),
        "max": round(float(df_clean[feat].max()), 2),
        "mean": round(float(df_clean[feat].mean()), 2),
        "median": round(float(df_clean[feat].median()), 2),
    }
    for feat in FEATURES
}

# ✅ Semua route pakai prefix /api/
@app.route('/api/', methods=['GET'])
def index():
    return jsonify({
        "status": "ok",
        "model": "Gradient Boosting Regressor",
        "metrics": {
            "r2_train": round(r2_train, 4),
            "r2_test": round(r2, 4),
            "rmse_train_thousands": round(rmse_train, 4),
            "rmse_test_thousands": round(rmse, 4),
        }
    })

@app.route('/api/info', methods=['GET'])
def info():
    return jsonify({
        "features": FEATURES,
        "statistics": stats,
        "model_metrics": {
            "r2_score": round(r2, 4),
            "rmse_thousands": round(rmse, 4),
            "feature_importance": importance_map,
        }
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    missing = [f for f in FEATURES if f not in data]
    if missing:
        return jsonify({"error": f"Fitur tidak lengkap: {missing}"}), 400

    errors, values = {}, {}
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

    X_input = pd.DataFrame([values])[FEATURES]
    price_k = max(float(model.predict(X_input)[0]), 0)

    return jsonify({
        "input": values,
        "prediction": {
            "price_thousands": round(price_k, 3),
            "price_usd": round(price_k * 1000, 0),
            "price_formatted": f"${price_k * 1000:,.0f}",
        }
    })

@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    data = request.get_json(force=True)
    items = data.get('items', [])
    if not items:
        return jsonify({"error": "Key 'items' kosong"}), 400

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
                "price_usd": round(price_k * 1000, 0),
                "price_formatted": f"${price_k * 1000:,.0f}",
            }
        })
    return jsonify({"results": results})

# ✅ HAPUS app.run() — Vercel handle sendiri