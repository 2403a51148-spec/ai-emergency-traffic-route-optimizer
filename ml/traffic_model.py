from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


# ============================================
# 1. TRAINING DATA
# ============================================

# Features:
# [Hour, Number of Vehicles, Average Speed]

X = [
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


# Traffic labels
y = [
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


# ============================================
# 2. SPLIT DATA
# ============================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# ============================================
# 3. CREATE RANDOM FOREST MODEL
# ============================================

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)


# ============================================
# 4. TRAIN MODEL
# ============================================

model.fit(X_train, y_train)


# ============================================
# 5. TEST MODEL
# ============================================

predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)


print()
print("====================================")
print("🚦 TRAFFIC PREDICTION MODEL")
print("====================================")

print(f"Model Accuracy: {accuracy * 100:.2f}%")


# ============================================
# 6. ACTUAL VS PREDICTED
# ============================================

print()
print("Actual vs Predicted")
print("------------------------------------")

for actual, predicted in zip(y_test, predictions):
    print(
        f"Actual: {actual:7} | Predicted: {predicted}"
    )


# ============================================
# 7. PREDICT NEW TRAFFIC
# ============================================

new_traffic = [[18, 160, 20]]

prediction = model.predict(new_traffic)


print()
print("====================================")
print("🔮 NEW TRAFFIC PREDICTION")
print("====================================")

print("Hour: 18")
print("Vehicles: 160")
print("Average Speed: 20 km/h")
print("Predicted Traffic:", prediction[0])


# ============================================
# 8. THREE ROUTES
# ============================================

# Format:
# [Route Name, Hour, Vehicles, Speed, Distance]

routes = [
    ["Route 1", 18, 160, 20, 8],
    ["Route 2", 18, 90, 35, 10],
    ["Route 3", 18, 45, 50, 12]
]


# Store route results
results = []


print()
print("====================================")
print("🚑 AI ROUTE ANALYSIS")
print("====================================")


# ============================================
# 9. PREDICT TRAFFIC FOR EACH ROUTE
# ============================================

for route_name, hour, vehicles, speed, distance in routes:

    traffic_prediction = model.predict(
        [[hour, vehicles, speed]]
    )[0]


    # ========================================
    # TRAFFIC PENALTY
    # ========================================

    if traffic_prediction == "LOW":
        traffic_penalty = 0

    elif traffic_prediction == "MEDIUM":
        traffic_penalty = 5

    else:
        traffic_penalty = 10


    # ========================================
    # ROUTE SCORE
    # ========================================

    score = distance + traffic_penalty


    # Store result
    results.append({
        "route": route_name,
        "traffic": traffic_prediction,
        "distance": distance,
        "score": score
    })


    # Display route information
    print()
    print(route_name)
    print("------------------------------------")
    print("Hour:", hour)
    print("Vehicles:", vehicles)
    print("Average Speed:", speed, "km/h")
    print("Distance:", distance, "km")
    print("Predicted Traffic:", traffic_prediction)
    print("Traffic Penalty:", traffic_penalty)
    print("Route Score:", score)


# ============================================
# 10. SELECT BEST ROUTE
# ============================================

best_route = min(
    results,
    key=lambda x: x["score"]
)


# ============================================
# 11. FINAL RECOMMENDATION
# ============================================

print()
print("====================================")
print("🏆 AI RECOMMENDED ROUTE")
print("====================================")

print("Route:", best_route["route"])
print("Traffic:", best_route["traffic"])
print("Distance:", best_route["distance"], "km")
print("Score:", best_route["score"])

print("====================================")