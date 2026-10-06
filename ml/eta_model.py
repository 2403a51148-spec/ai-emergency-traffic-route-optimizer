from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error


# ============================================
# 1. TRAINING DATA
# ============================================

# Features:
# [Distance (km), Vehicles, Average Speed (km/h)]

X = [
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

y = [
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


# ============================================
# 2. SPLIT DATA
# ============================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)


# ============================================
# 3. CREATE ETA MODEL
# ============================================

model = RandomForestRegressor(
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

mae = mean_absolute_error(y_test, predictions)


print()
print("====================================")
print("⏱️ ETA PREDICTION MODEL")
print("====================================")

print(f"Mean Absolute Error: {mae:.2f} minutes")


# ============================================
# 6. TEST NEW ROUTE
# ============================================

new_route = [[8, 90, 30]]

predicted_eta = model.predict(new_route)[0]


print()
print("====================================")
print("🔮 NEW ETA PREDICTION")
print("====================================")

print("Distance: 8 km")
print("Vehicles: 90")
print("Average Speed: 30 km/h")
print(f"Predicted ETA: {predicted_eta:.2f} minutes")

print("====================================")


# ============================================
# 7. PREDICT ETA FOR 3 AMBULANCE ROUTES
# ============================================

routes = [
    ["Route 1", 8, 160, 20],
    ["Route 2", 10, 90, 35],
    ["Route 3", 12, 45, 50]
]


print()
print("====================================")
print("🚑 ROUTE-WISE AI ETA")
print("====================================")


for route_name, distance, vehicles, speed in routes:

    eta = model.predict([
        [distance, vehicles, speed]
    ])[0]

    print()
    print(route_name)
    print("------------------------------------")
    print("Distance:", distance, "km")
    print("Vehicles:", vehicles)
    print("Average Speed:", speed, "km/h")
    print(f"AI Predicted ETA: {eta:.2f} minutes")


print()
print("====================================")