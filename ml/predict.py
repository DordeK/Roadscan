#!/usr/bin/env python3
"""
Run the trained pothole model on a CSV file (app export or synthetic data).

Usage:
  python3 ml/predict.py --input ml/training_data.csv
  python3 ml/predict.py --input my_drive.csv --threshold 0.35
"""

import argparse, os, pickle, json
import pandas as pd
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def extract_window_features(df, window=20):
    half = window // 2
    n = len(df)
    va = df["vert_accel_ms2"].values
    dv = df["delta_ms2"].values
    ax = df["ax_g"].values
    ay = df["ay_g"].values
    az = df["az_g"].values

    feats = []
    for i in range(n):
        lo, hi = max(0, i - half), min(n, i + half + 1)
        w_va, w_dv = va[lo:hi], dv[lo:hi]
        w_ax, w_ay, w_az = ax[lo:hi], ay[lo:hi], az[lo:hi]

        dv_min, dv_max = w_dv.min(), w_dv.max()
        min_pos = np.argmin(w_dv)
        max_after = w_dv[min_pos:].max() if min_pos < len(w_dv) - 1 else 0.0

        feats.append([
            w_va.mean(), w_va.std(), w_va.min(), w_va.max(), w_va.max() - w_va.min(),
            w_dv.mean(), w_dv.std(), dv_min, dv_max, dv_max - dv_min,
            (-dv_min) * max_after,
            (-dv_min / (dv_max + 1e-6)) if dv_max > 0 else 0.0,
            int(np.sum(w_dv < -1.5)), int(np.sum(w_dv > 1.0)),
            w_ax.std(), w_ay.std(), w_az.std(),
            float(np.sqrt(np.mean(w_va ** 2))), float(np.sqrt(np.mean(w_dv ** 2))),
            va[i], dv[i],
        ])

    cols = [
        "va_mean","va_std","va_min","va_max","va_range",
        "dv_mean","dv_std","dv_min","dv_max","dv_range",
        "spike_score","down_up_ratio","down_cross","up_cross",
        "ax_std","ay_std","az_std","rms_va","rms_dv","cur_va","cur_dv",
    ]
    return pd.DataFrame(feats, columns=cols, index=df.index)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",     required=True)
    parser.add_argument("--model",     default=os.path.join(SCRIPT_DIR, "pothole_model.pkl"))
    parser.add_argument("--threshold", type=float, default=0.40,
                        help="Probability threshold for positive prediction (default 0.40)")
    parser.add_argument("--out",       default=None, help="Save predictions to CSV")
    args = parser.parse_args()

    with open(args.model, "rb") as f:
        bundle = pickle.load(f)
    model = bundle["model"]
    window = bundle["window"]

    df = pd.read_csv(args.input)
    print(f"Loaded {len(df):,} samples from {args.input}")

    X = extract_window_features(df, window=window)
    probs = model.predict_proba(X)[:, 1]
    preds = (probs >= args.threshold).astype(int)

    df["ml_prob"]       = probs.round(4)
    df["ml_prediction"] = preds

    # Summary
    n_detected = preds.sum()
    print(f"\nThreshold : {args.threshold}")
    print(f"Detected  : {n_detected} pothole samples  ({100*n_detected/len(df):.1f}%)")

    if "pothole_label" in df.columns:
        from sklearn.metrics import classification_report, roc_auc_score, f1_score
        y_true = df["pothole_label"]
        print(f"AUC-ROC   : {roc_auc_score(y_true, probs):.4f}")
        print(f"F1        : {f1_score(y_true, preds):.4f}")
        print()
        print(classification_report(y_true, preds, target_names=["no_pothole", "pothole"]))

    # Show top detections
    top = df[df["ml_prediction"] == 1].nlargest(10, "ml_prob")[
        ["session_id", "t", "vert_accel_ms2", "delta_ms2", "ml_prob"]
        if "session_id" in df.columns else
        ["t", "vert_accel_ms2", "delta_ms2", "ml_prob"]
    ]
    print("Top detections by probability:")
    print(top.to_string(index=False))

    if args.out:
        df.to_csv(args.out, index=False)
        print(f"\nPredictions saved → {args.out}")


if __name__ == "__main__":
    main()
