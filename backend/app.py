from flask import Flask, jsonify, request
from flask_cors import CORS

import sys
import os

# Allow Python to find files inside the ml folder
sys.path.append(os.path.abspath("../ml"))

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor


app = Flask(__name__)
CORS(app)


# ============================================================
# TRAFFIC MODEL
# ============================================================

traffic_X = [
    [7, 30, 50],
    [8, 50, 45],
    [9, 80, 35],
    [10, 40, 50],
    [11, 35, 55],
    [12, 45, 48],
    [13, 50, 45],
    [14, 40, 50],
    [15, 45, 47],
    [16, 60, 42],
    [17, 100, 30],
    [18, 150, 20],
    [19, 180, 15],
    [20, 140, 25],
    [21, 90, 35],
    [7, 35, 48],
    [8, 60, 40],
    [9, 85, 32],
    [17, 120, 25],
    [18, 160, 18],
    [19, 190, 12],
    [20, 130, 25],
    [21, 95, 32],
    [10, 45, 50],
    [11, 40, 52],
    [12, 55, 45],
    [13, 60, 43],
    [14, 50, 48],
    [15, 65, 40],
    [16, 70, 38]
]

traffic_y = [
    "LOW", "LOW", "MEDIUM", "LOW", "LOW",
    "LOW", "LOW", "LOW", "LOW", "MEDIUM",
    "HIGH", "HIGH", "HIGH", "HIGH", "MEDIUM",
    "LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH",
    "HIGH", "HIGH", "MEDIUM", "LOW", "LOW",
    "LOW", "LOW", "LOW", "MEDIUM", "MEDIUM"
]


traffic_model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

traffic_model.fit(traffic_X, traffic_y)


# ============================================================
# ETA MODEL
# ============================================================

eta_X = [
    [5, 30, 50],
    [6, 40, 45],
    [7, 50, 40],
    [8, 60, 35],
    [9, 80, 30],
    [10, 100, 25],
    [11, 120, 22],
    [12, 140, 20],
    [13, 160, 18],
    [14, 180, 15],
    [5, 35, 48],
    [6, 50, 42],
    [7, 70, 35],
    [8, 90, 30],
    [9, 110, 25],
    [10, 130, 22],
    [11, 150, 20],
    [12, 170, 18],
    [7, 40, 50],
    [8, 55, 45],
    [9, 65, 40],
    [10, 85, 32],
    [11, 105, 27],
    [12, 125, 23],
    [13, 145, 20],
    [14, 165, 17],
    [6, 45, 46],
    [8, 75, 38],
    [10, 115, 26],
    [12, 155, 19]
]

eta_y = [
    6, 8, 11, 14, 18, 24, 30, 36, 43, 56,
    6, 9, 12, 16, 22, 29, 34, 40, 8, 11,
    14, 19, 25, 31, 39, 49, 8, 13, 23, 38
]


eta_model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

eta_model.fit(eta_X, eta_y)


# ============================================================
# HOME API
# ============================================================

@app.route("/")
def home():
    return jsonify({
        "message": "🚑 Ambulance Route Optimizer API is running!"
    })


# ============================================================
# ROUTE OPTIMIZATION API
# ============================================================

@app.route("/optimize-route", methods=["POST"])
def optimize_route():

    data = request.get_json()

    hour = data["hour"]
    distance = data["distance"]
    vehicles = data["vehicles"]
    speed = data["speed"]

    # Traffic prediction
    traffic = traffic_model.predict(
        [[hour, vehicles, speed]]
    )[0]

    # ETA prediction
    eta = eta_model.predict(
        [[distance, vehicles, speed]]
    )[0]

    # Traffic penalty
    if traffic == "LOW":
        traffic_penalty = 0
    elif traffic == "MEDIUM":
        traffic_penalty = 5
    else:
        traffic_penalty = 10

    # Final route score
    score = eta + traffic_penalty

    return jsonify({
        "traffic": traffic,
        "predicted_eta": round(float(eta), 2),
        "traffic_penalty": traffic_penalty,
        "route_score": round(float(score), 2)
    })


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":
    app.run(debug=True)