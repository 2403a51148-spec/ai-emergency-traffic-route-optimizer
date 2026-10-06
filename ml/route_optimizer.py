from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_absolute_error


# ============================================================
# 1. TRAFFIC MODEL DATA
# ============================================================

# Features:
# [Hour, Number of Vehicles, Average Speed]

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
    "LOW",
    "LOW",
    "MEDIUM",
    "LOW",
    "LOW",
    "LOW",
    "LOW",
    "LOW",
    "LOW",
    "MEDIUM",
    "HIGH",
    "HIGH",
    "HIGH",
    "HIGH",
    "MEDIUM",
    "LOW",
    "MEDIUM",
    "MEDIUM",
    "HIGH",
    "HIGH",
    "HIGH",
    "HIGH",
    "MEDIUM",
    "LOW",
    "LOW",
    "LOW",
    "LOW",
    "LOW",
    "MEDIUM",
    "MEDIUM"
]


# ============================================================
# 2. TRAIN TRAFFIC MODEL
# ============================================================

traffic_X_train, traffic_X_test, traffic_y_train, traffic_y_test = (
    train_test_split(
        traffic_X,
        traffic_y,
        test_size=0.2,
        random_state=42,
        stratify=traffic_y
    )
)

traffic_model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

traffic_model.fit(
    traffic_X_train,
    traffic_y_train
)

traffic_predictions = traffic_model.predict(
    traffic_X_test
)

traffic_accuracy = accuracy_score(
    traffic_y_test,
    traffic_predictions
)


# ============================================================
# 3. ETA MODEL DATA
# ============================================================

# Features:
# [Distance (km), Vehicles, Average Speed (km/h)]

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

# Target:
# Travel time in minutes

eta_y = [
    6,
    8,
    11,
    14,
    18,
    24,
    30,
    36,
    43,
    56,
    6,
    9,
    12,
    16,
    22,
    29,
    34,
    40,
    8,
    11,
    14,
    19,
    25,
    31,
    39,
    49,
    8,
    13,
    23,
    38
]


# ============================================================
# 4. TRAIN ETA MODEL
# ============================================================

eta_X_train, eta_X_test, eta_y_train, eta_y_test = (
    train_test_split(
        eta_X,
        eta_y,
        test_size=0.2,
        random_state=42
    )
)

eta_model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

eta_model.fit(
    eta_X_train,
    eta_y_train
)

eta_predictions = eta_model.predict(
    eta_X_test
)

eta_mae = mean_absolute_error(
    eta_y_test,
    eta_predictions
)


# ============================================================
# 5. DISPLAY MODEL PERFORMANCE
# ============================================================

print()
print("==================================================")
print("🚑 AI EMERGENCY ROUTE OPTIMIZER")
print("==================================================")

print()
print("🤖 TRAFFIC MODEL")
print("------------------------------------")
print(
    f"Traffic Model Accuracy: "
    f"{traffic_accuracy * 100:.2f}%"
)

print()
print("⏱️ ETA MODEL")
print("------------------------------------")
print(
    f"ETA Mean Absolute Error: "
    f"{eta_mae:.2f} minutes"
)


# ============================================================
# 6. CURRENT ROUTE INFORMATION
# ============================================================

# Format:
# [Route Name, Hour, Distance, Vehicles, Average Speed]

routes = [
    ["Route 1", 18, 8, 160, 20],
    ["Route 2", 18, 10, 90, 35],
    ["Route 3", 18, 12, 45, 50]
]


# ============================================================
# 7. ANALYZE EACH ROUTE
# ============================================================

route_results = []

print()
print("==================================================")
print("🛣️ AI ROUTE ANALYSIS")
print("==================================================")


for route_name, hour, distance, vehicles, speed in routes:

    # --------------------------------------------
    # Traffic Prediction
    # --------------------------------------------

    traffic_prediction = traffic_model.predict(
        [[hour, vehicles, speed]]
    )[0]


    # --------------------------------------------
    # ETA Prediction
    # --------------------------------------------

    predicted_eta = eta_model.predict(
        [[distance, vehicles, speed]]
    )[0]


    # --------------------------------------------
    # Traffic Penalty
    # --------------------------------------------

    if traffic_prediction == "LOW":
        traffic_penalty = 0

    elif traffic_prediction == "MEDIUM":
        traffic_penalty = 5

    else:
        traffic_penalty = 10


    # --------------------------------------------
    # Route Score
    # --------------------------------------------

    route_score = predicted_eta + traffic_penalty


    # --------------------------------------------
    # Store Result
    # --------------------------------------------

    route_results.append({
        "route": route_name,
        "distance": distance,
        "vehicles": vehicles,
        "speed": speed,
        "traffic": traffic_prediction,
        "eta": predicted_eta,
        "traffic_penalty": traffic_penalty,
        "score": route_score
    })


    # --------------------------------------------
    # Display Result
    # --------------------------------------------

    print()
    print(route_name)
    print("------------------------------------")

    print("Distance:", distance, "km")
    print("Vehicles:", vehicles)
    print("Average Speed:", speed, "km/h")

    print(
        "AI Predicted Traffic:",
        traffic_prediction
    )

    print(
        f"AI Predicted ETA: "
        f"{predicted_eta:.2f} minutes"
    )

    print(
        "Traffic Penalty:",
        traffic_penalty
    )

    print(
        f"Route Score: "
        f"{route_score:.2f}"
    )


# ============================================================
# 8. SELECT BEST ROUTE
# ============================================================

best_route = min(
    route_results,
    key=lambda route: route["score"]
)


# ============================================================
# 9. FINAL AI RECOMMENDATION
# ============================================================

print()
print("==================================================")
print("🏆 AI RECOMMENDED ROUTE")
print("==================================================")

print(
    "Recommended Route:",
    best_route["route"]
)

print(
    "Traffic:",
    best_route["traffic"]
)

print(
    "Distance:",
    best_route["distance"],
    "km"
)

print(
    f"Predicted ETA: "
    f"{best_route['eta']:.2f} minutes"
)

print(
    "Route Score:",
    f"{best_route['score']:.2f}"
)

print("==================================================")