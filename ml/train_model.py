#!/usr/bin/env python3
"""
Pothole detection ML pipeline.

Steps:
  1. Load training_data.csv
  2. Engineer sliding-window features (~1 second context per sample)
  3. Train/test split by session (no leakage across time)
  4. Train Random Forest + XGBoost, pick best by F1
  5. Print evaluation (precision, recall, F1, AUC, confusion matrix)
  6. Save best model as pothole_model.pkl  (sklearn) and pothole_model.onnx (portable)
  7. Print feature importance

Usage:
  python3 ml/train_model.py
  python3 ml/train_model.py --data ml/training_data.csv --window 20
"""

import argparse
import csv
import os
import pickle
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, f1_score
)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import xgboost as xgb

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


# ─── 1. Feature engineering ───────────────────────────────────────────────────

def extract_window_features(df: pd.DataFrame, window: int = 20) -> pd.DataFrame:
    """
    For each sample, compute statistics over a centered rolling window.
    Window = 20 samples = 1 second at 20 Hz.
    Returns a feature DataFrame aligned with df (same index).
    """
    half = window // 2
    n = len(df)

    va = df["vert_accel_ms2"].values
    dv = df["delta_ms2"].values
    ax = df["ax_g"].values
    ay = df["ay_g"].values
    az = df["az_g"].values

    feats = []
    for i in range(n):
        lo = max(0, i - half)
        hi = min(n, i + half + 1)
        w_va = va[lo:hi]
        w_dv = dv[lo:hi]
        w_ax = ax[lo:hi]
        w_ay = ay[lo:hi]
        w_az = az[lo:hi]

        # ── Vertical acceleration stats ────────────────────────────────────────
        va_mean  = w_va.mean()
        va_std   = w_va.std()
        va_min   = w_va.min()
        va_max   = w_va.max()
        va_range = va_max - va_min

        # ── Delta (jerk) stats ─────────────────────────────────────────────────
        dv_mean   = w_dv.mean()
        dv_std    = w_dv.std()
        dv_min    = w_dv.min()   # most negative (downward jerk)
        dv_max    = w_dv.max()   # most positive (upward jerk)
        dv_range  = dv_max - dv_min

        # ── V-spike pattern features ───────────────────────────────────────────
        # Find max negative then max positive (pothole signature)
        min_pos = np.argmin(w_dv)
        max_after = w_dv[min_pos:].max() if min_pos < len(w_dv) - 1 else 0.0
        spike_score = (-dv_min) * max_after   # product: high when both spikes strong

        # Asymmetry: pothole down > up ratio
        down_up_ratio = (-dv_min / (dv_max + 1e-6)) if dv_max > 0 else 0.0

        # Number of threshold crossings in window
        down_cross = int(np.sum(w_dv < -1.5))
        up_cross   = int(np.sum(w_dv >  1.0))

        # ── Lateral / forward stats ────────────────────────────────────────────
        ax_std = w_ax.std()
        ay_std = w_ay.std()
        az_std = w_az.std()

        # ── Energy ────────────────────────────────────────────────────────────
        rms_va = float(np.sqrt(np.mean(w_va ** 2)))
        rms_dv = float(np.sqrt(np.mean(w_dv ** 2)))

        # ── Current-sample raw values (local context) ─────────────────────────
        cur_va = va[i]
        cur_dv = dv[i]

        feats.append([
            va_mean, va_std, va_min, va_max, va_range,
            dv_mean, dv_std, dv_min, dv_max, dv_range,
            spike_score, down_up_ratio,
            down_cross, up_cross,
            ax_std, ay_std, az_std,
            rms_va, rms_dv,
            cur_va, cur_dv,
        ])

    cols = [
        "va_mean", "va_std", "va_min", "va_max", "va_range",
        "dv_mean", "dv_std", "dv_min", "dv_max", "dv_range",
        "spike_score", "down_up_ratio",
        "down_cross", "up_cross",
        "ax_std", "ay_std", "az_std",
        "rms_va", "rms_dv",
        "cur_va", "cur_dv",
    ]
    return pd.DataFrame(feats, columns=cols, index=df.index)


# ─── 2. Train/test split by session ───────────────────────────────────────────

# Hold out these sessions for testing — different road types than training
TEST_SESSIONS = {"bad_road", "city_smooth"}


def split_by_session(X: pd.DataFrame, y: pd.Series, sessions: pd.Series):
    test_mask = sessions.isin(TEST_SESSIONS)
    return (
        X[~test_mask], X[test_mask],
        y[~test_mask], y[test_mask],
    )


# ─── 3. Model definitions ─────────────────────────────────────────────────────

def build_models():
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
    )

    xgb_model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=19,   # ~95/5 negative/positive ratio
        eval_metric="logloss",
        random_state=42,
        verbosity=0,
    )

    return {"RandomForest": rf, "XGBoost": xgb_model}


# ─── 4. Evaluation ────────────────────────────────────────────────────────────

def evaluate(name, model, X_test, y_test):
    y_pred  = model.predict(X_test)
    y_prob  = model.predict_proba(X_test)[:, 1]
    auc     = roc_auc_score(y_test, y_prob)
    f1      = f1_score(y_test, y_pred)
    cm      = confusion_matrix(y_test, y_pred)
    report  = classification_report(y_test, y_pred, target_names=["no_pothole", "pothole"])

    print(f"\n{'─'*55}")
    print(f"  {name}")
    print(f"{'─'*55}")
    print(report)
    print(f"  AUC-ROC : {auc:.4f}")
    print(f"  F1      : {f1:.4f}")
    print(f"  Confusion matrix (rows=actual, cols=pred):")
    print(f"    TN={cm[0,0]:5d}  FP={cm[0,1]:5d}")
    print(f"    FN={cm[1,0]:5d}  TP={cm[1,1]:5d}")
    return f1, auc


# ─── 5. Feature importance ────────────────────────────────────────────────────

def print_feature_importance(model, feature_names, top_n=10):
    if hasattr(model, "feature_importances_"):
        imp = model.feature_importances_
        ranked = sorted(zip(feature_names, imp), key=lambda x: -x[1])
        print(f"\n  Top {top_n} features:")
        for fname, score in ranked[:top_n]:
            bar = "█" * int(score * 200)
            print(f"    {fname:20s}  {score:.4f}  {bar}")


# ─── 6. ONNX export ───────────────────────────────────────────────────────────

def export_onnx(model, X_sample, out_path):
    try:
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
        n_features = X_sample.shape[1]
        initial_type = [("float_input", FloatTensorType([None, n_features]))]
        onnx_model = convert_sklearn(model, initial_types=initial_type)
        with open(out_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
        print(f"  ONNX model saved → {out_path}")
        return True
    except Exception as e:
        print(f"  ONNX export skipped: {e}")
        return False


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data",   default=os.path.join(SCRIPT_DIR, "training_data.csv"))
    parser.add_argument("--window", type=int, default=20, help="Sliding window size (samples)")
    args = parser.parse_args()

    print(f"\n{'═'*55}")
    print("  Pothole Detection — ML Training Pipeline")
    print(f"{'═'*55}")

    # ── Load ──────────────────────────────────────────────────────────────────
    print(f"\n[1/5] Loading {args.data}...")
    df = pd.read_csv(args.data)
    print(f"      {len(df):,} samples  |  sessions: {sorted(df['session_id'].unique())}")
    print(f"      Label balance: {df['pothole_label'].value_counts().to_dict()}")

    # ── Feature engineering ───────────────────────────────────────────────────
    print(f"\n[2/5] Extracting window features (window={args.window} samples)...")
    feature_dfs = []
    for session_id, group in df.groupby("session_id"):
        feat_group = extract_window_features(group.reset_index(drop=True), window=args.window)
        feat_group.index = group.index
        feature_dfs.append(feat_group)
    X = pd.concat(feature_dfs).sort_index()
    y = df["pothole_label"]
    sessions = df["session_id"]
    print(f"      Feature matrix: {X.shape}  ({X.shape[1]} features per sample)")

    # ── Split ─────────────────────────────────────────────────────────────────
    print(f"\n[3/5] Splitting by session (test={sorted(TEST_SESSIONS)})...")
    X_train, X_test, y_train, y_test = split_by_session(X, y, sessions)
    print(f"      Train: {len(X_train):,} samples  (pos={y_train.sum()}, neg={(y_train==0).sum()})")
    print(f"      Test : {len(X_test):,}  samples  (pos={y_test.sum()},  neg={(y_test==0).sum()})")

    # ── Train ─────────────────────────────────────────────────────────────────
    print(f"\n[4/5] Training models...")
    models = build_models()
    trained = {}
    for name, model in models.items():
        print(f"      {name}...", end=" ", flush=True)
        model.fit(X_train, y_train)
        print("done")
        trained[name] = model

    # ── Evaluate ──────────────────────────────────────────────────────────────
    print(f"\n[5/5] Evaluation on held-out sessions ({sorted(TEST_SESSIONS)}):")
    results = {}
    for name, model in trained.items():
        f1, auc = evaluate(name, model, X_test, y_test)
        results[name] = {"f1": f1, "auc": auc, "model": model}

    # Pick best by F1
    best_name = max(results, key=lambda n: results[n]["f1"])
    best_model = results[best_name]["model"]
    print(f"\n{'─'*55}")
    print(f"  Best model: {best_name}  (F1={results[best_name]['f1']:.4f}, AUC={results[best_name]['auc']:.4f})")

    # Feature importance
    print_feature_importance(best_model, list(X.columns))

    # ── Save ──────────────────────────────────────────────────────────────────
    pkl_path  = os.path.join(SCRIPT_DIR, "pothole_model.pkl")
    onnx_path = os.path.join(SCRIPT_DIR, "pothole_model.onnx")
    meta_path = os.path.join(SCRIPT_DIR, "model_meta.json")

    with open(pkl_path, "wb") as f:
        pickle.dump({"model": best_model, "feature_names": list(X.columns), "window": args.window}, f)
    print(f"\n  Sklearn model saved → {pkl_path}")

    export_onnx(best_model, X_test.values.astype("float32"), onnx_path)

    import json
    meta = {
        "best_model": best_name,
        "f1": round(results[best_name]["f1"], 4),
        "auc": round(results[best_name]["auc"], 4),
        "window_samples": args.window,
        "feature_names": list(X.columns),
        "test_sessions": sorted(TEST_SESSIONS),
        "train_sessions": sorted(set(df["session_id"]) - TEST_SESSIONS),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "positive_rate_train": round(float(y_train.mean()), 4),
        "positive_rate_test": round(float(y_test.mean()), 4),
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  Model metadata    → {meta_path}")
    print(f"\n{'═'*55}\n")


if __name__ == "__main__":
    main()
