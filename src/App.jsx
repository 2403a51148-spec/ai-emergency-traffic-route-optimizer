import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

function App() {
  const ambulanceStart = [17.9784, 79.5941];
  const hospitalPosition = [17.9684, 79.6041];

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [ambulancePosition, setAmbulancePosition] =
    useState(ambulanceStart);

  const [ambulanceIndex, setAmbulanceIndex] = useState(0);
  const [ambulanceProgress, setAmbulanceProgress] = useState(0);
  const [ambulanceFinished, setAmbulanceFinished] = useState(false);

  const [liveETA, setLiveETA] = useState(null);

  const [chatInput, setChatInput] = useState("");

  const [chatMessages, setChatMessages] = useState([
    {
      sender: "assistant",
      text:
        "Hello! I am the Emergency Route Assistant. Ask me about the best route, traffic, ETA, safety, ambulance location, or the Green Corridor.",
    },
  ]);

  // ============================================================
  // FLASHING AMBULANCE ICON
  // ============================================================

  const ambulanceIcon = useMemo(() => {
    return L.divIcon({
      className: "ambulance-marker",
      html: `
        <div class="ambulance-marker-wrapper">
          <div class="ambulance-pulse"></div>
          <div class="ambulance-icon">🚑</div>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
      popupAnchor: [0, -25],
    });
  }, []);

  // ============================================================
  // GET ROAD ROUTE FROM OSRM
  // ============================================================

  const getRoute = async (waypoints) => {
    try {
      const coordinates = waypoints
        .map((point) => `${point[1]},${point[0]}`)
        .join(";");

      const url =
        "https://router.project-osrm.org/route/v1/driving/" +
        coordinates +
        "?overview=full&geometries=geojson";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Routing request failed");
      }

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        return null;
      }

      const route = data.routes[0];

      const coordinatesLatLng =
        route.geometry.coordinates.map((point) => [
          point[1],
          point[0],
        ]);

      return {
        coordinates: coordinatesLatLng,
        distance: route.distance / 1000,
        normalETA: Math.ceil(route.duration / 60),
      };
    } catch (error) {
      console.error("Routing error:", error);
      return null;
    }
  };

  // ============================================================
  // FLASK AI API
  // ============================================================

  const getAIAnalysis = async (distance, vehicles, speed) => {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/optimize-route",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hour: new Date().getHours(),
            distance: distance,
            vehicles: vehicles,
            speed: speed,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("AI API request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("AI API error:", error);
      return null;
    }
  };

  // ============================================================
  // ANALYZE ROUTES
  // ============================================================

  const analyzeRoutes = async () => {
    try {
      setLoading(true);

      const route1 = await getRoute([
        ambulanceStart,
        hospitalPosition,
      ]);

      const route2 = await getRoute([
        ambulanceStart,
        [17.9845, 79.6000],
        hospitalPosition,
      ]);

      const route3 = await getRoute([
        ambulanceStart,
        [17.9700, 79.5900],
        hospitalPosition,
      ]);

      const rawRoutes = [];

      if (route1) {
        rawRoutes.push(route1);
      }

      if (route2) {
        rawRoutes.push(route2);
      }

      if (route3) {
        rawRoutes.push(route3);
      }

      // ========================================================
      // DYNAMIC TRAFFIC
      // ========================================================

      const trafficInputs = [
        {
          vehicles: Math.floor(100 + Math.random() * 100),
          speed: Math.floor(18 + Math.random() * 12),
        },
        {
          vehicles: Math.floor(60 + Math.random() * 70),
          speed: Math.floor(25 + Math.random() * 15),
        },
        {
          vehicles: Math.floor(30 + Math.random() * 50),
          speed: Math.floor(35 + Math.random() * 15),
        },
      ];

      // ========================================================
      // AI ANALYSIS
      // ========================================================

      const analyzedRoutes = [];

      for (let i = 0; i < rawRoutes.length; i++) {
        const route = rawRoutes[i];
        const trafficInput = trafficInputs[i];

        const aiResult = await getAIAnalysis(
          route.distance,
          trafficInput.vehicles,
          trafficInput.speed
        );

        if (aiResult) {
          analyzedRoutes.push({
            ...route,
            routeNumber: i + 1,
            vehicles: trafficInput.vehicles,
            speed: trafficInput.speed,
            traffic: aiResult.traffic,
            predictedETA: aiResult.predicted_eta,
            trafficPenalty: aiResult.traffic_penalty,
            score: aiResult.route_score,
          });
        }
      }

      // ========================================================
      // LOWEST SCORE = BEST ROUTE
      // ========================================================

      analyzedRoutes.sort((a, b) => a.score - b.score);

      const updatedRoutes = analyzedRoutes.map(
        (route, index) => ({
          ...route,
          isRecommended: index === 0,
        })
      );

      setRoutes(updatedRoutes);

      // Restart ambulance on recommended route
      setAmbulanceIndex(0);
      setAmbulanceProgress(0);
      setAmbulanceFinished(false);

      if (updatedRoutes.length > 0) {
        setAmbulancePosition(
          updatedRoutes[0].coordinates[0]
        );

        setLiveETA(
          updatedRoutes[0].predictedETA
        );
      }

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error("Route analysis error:", error);
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD + DYNAMIC REROUTING
  // ============================================================

  useEffect(() => {
    analyzeRoutes();

    const interval = setInterval(() => {
      analyzeRoutes();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // SMOOTH AMBULANCE MOVEMENT
  // ============================================================

  useEffect(() => {
    const recommendedRoute = routes.find(
      (route) => route.isRecommended
    );

    if (
      !recommendedRoute ||
      !recommendedRoute.coordinates ||
      recommendedRoute.coordinates.length < 2
    ) {
      return;
    }

    if (ambulanceFinished) {
      return;
    }

    const movementTimer = setInterval(() => {
      setAmbulanceProgress((previousProgress) => {
        const newProgress = previousProgress + 0.025;

        if (newProgress >= 1) {
          setAmbulanceIndex((previousIndex) => {
            const nextIndex = previousIndex + 1;

            if (
              nextIndex >=
              recommendedRoute.coordinates.length - 1
            ) {
              setAmbulancePosition(hospitalPosition);
              setLiveETA(0);
              setAmbulanceFinished(true);

              return previousIndex;
            }

            return nextIndex;
          });

          return 0;
        }

        return newProgress;
      });
    }, 80);

    return () => {
      clearInterval(movementTimer);
    };
  }, [routes, ambulanceFinished]);

  // ============================================================
  // CALCULATE SMOOTH POSITION
  // ============================================================

  useEffect(() => {
    const recommendedRoute = routes.find(
      (route) => route.isRecommended
    );

    if (
      !recommendedRoute ||
      !recommendedRoute.coordinates
    ) {
      return;
    }

    const coordinates = recommendedRoute.coordinates;

    if (ambulanceIndex >= coordinates.length - 1) {
      return;
    }

    const startPoint = coordinates[ambulanceIndex];
    const endPoint = coordinates[ambulanceIndex + 1];

    const lat =
      startPoint[0] +
      (endPoint[0] - startPoint[0]) *
        ambulanceProgress;

    const lng =
      startPoint[1] +
      (endPoint[1] - startPoint[1]) *
        ambulanceProgress;

    setAmbulancePosition([lat, lng]);
  }, [
    ambulanceIndex,
    ambulanceProgress,
    routes,
  ]);

  // ============================================================
  // LIVE ETA COUNTDOWN
  // ============================================================

  useEffect(() => {
    if (liveETA === null || liveETA <= 0) {
      return;
    }

    const etaTimer = setInterval(() => {
      setLiveETA((previousETA) => {
        if (previousETA === null) {
          return null;
        }

        const nextETA = previousETA - 0.1;

        return nextETA > 0 ? nextETA : 0;
      });
    }, 1000);

    return () => {
      clearInterval(etaTimer);
    };
  }, [routes]);

  // ============================================================
  // TRAFFIC COLOR
  // ============================================================

  const getTrafficColor = (traffic) => {
    if (traffic === "LOW") {
      return "green";
    }

    if (traffic === "MEDIUM") {
      return "orange";
    }

    return "red";
  };

  // ============================================================
  // CHAT ASSISTANT
  // ============================================================

  const handleChat = () => {
    if (!chatInput.trim()) {
      return;
    }

    const question = chatInput.trim();
    const lowerQuestion = question.toLowerCase();

    let answer =
      "I can help you understand the current ambulance routes, traffic, ETA, route score, safety, and emergency corridor.";

    if (
      lowerQuestion.includes("best") ||
      lowerQuestion.includes("recommended") ||
      lowerQuestion.includes("which route")
    ) {
      if (routes.length > 0) {
        const bestRoute = routes[0];

        answer =
          `Currently, Route ${bestRoute.routeNumber} is recommended. ` +
          `Its AI predicted ETA is ${bestRoute.predictedETA} minutes, ` +
          `with ${bestRoute.traffic} traffic and a route score of ${bestRoute.score}.`;
      } else {
        answer =
          "Route analysis is still loading. Please wait.";
      }
    } else if (
      lowerQuestion.includes("traffic")
    ) {
      if (routes.length > 0) {
        answer =
          "Current traffic levels are: " +
          routes
            .map(
              (route) =>
                `Route ${route.routeNumber}: ${route.traffic}`
            )
            .join(", ") +
          ".";
      }
    } else if (
      lowerQuestion.includes("eta") ||
      lowerQuestion.includes("time") ||
      lowerQuestion.includes("how long")
    ) {
      if (routes.length > 0) {
        answer =
          "Current AI predicted ETAs are: " +
          routes
            .map(
              (route) =>
                `Route ${route.routeNumber}: ${route.predictedETA} minutes`
            )
            .join(", ") +
          ".";
      }
    } else if (
      lowerQuestion.includes("safe") ||
      lowerQuestion.includes("safety")
    ) {
      if (routes.length > 0) {
        const bestRoute = routes[0];

        answer =
          `Route ${bestRoute.routeNumber} is currently preferred because it has the lowest AI route score.`;
      }
    } else if (
      lowerQuestion.includes("vehicle")
    ) {
      if (routes.length > 0) {
        answer =
          "Current simulated vehicle counts are: " +
          routes
            .map(
              (route) =>
                `Route ${route.routeNumber}: ${route.vehicles}`
            )
            .join(", ") +
          ".";
      }
    } else if (
      lowerQuestion.includes("score")
    ) {
      if (routes.length > 0) {
        answer =
          "Current AI route scores are: " +
          routes
            .map(
              (route) =>
                `Route ${route.routeNumber}: ${route.score}`
            )
            .join(", ") +
          ". Lower score means a better route.";
      }
    } else if (
      lowerQuestion.includes("green corridor") ||
      lowerQuestion.includes("emergency corridor") ||
      lowerQuestion.includes("priority")
    ) {
      if (routes.length > 0) {
        const bestRoute = routes[0];

        answer =
          `The Emergency Green Corridor is active on Route ${bestRoute.routeNumber}. It is the current AI-recommended route.`;
      }
    } else if (
      lowerQuestion.includes("ambulance") ||
      lowerQuestion.includes("where")
    ) {
      if (ambulanceFinished) {
        answer =
          "The ambulance has reached the hospital.";
      } else {
        answer =
          "The ambulance is currently moving along the AI-recommended emergency route.";
      }
    } else {
      answer =
        "You can ask: Which route is best? What is the traffic? What is the ETA? Which route is safer? What are the route scores? Is the Green Corridor active? Where is the ambulance?";
    }

    setChatMessages((previousMessages) => [
      ...previousMessages,
      {
        sender: "user",
        text: question,
      },
      {
        sender: "assistant",
        text: answer,
      },
    ]);

    setChatInput("");
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "10px",
        backgroundColor: "#f5f7fa",
        minHeight: "100vh",
      }}
    >
      {/* FLASHING AMBULANCE CSS */}

      <style>
        {`
          .ambulance-marker {
            background: transparent;
            border: none;
          }

          .ambulance-marker-wrapper {
            position: relative;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ambulance-icon {
            position: relative;
            z-index: 2;
            font-size: 34px;
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(255,0,0,0.7);
          }

          .ambulance-pulse {
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 3px solid red;
            animation: ambulancePulse 1s infinite;
          }

          @keyframes ambulancePulse {
            0% {
              transform: scale(0.7);
              opacity: 1;
            }

            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
        `}
      </style>

      {/* TITLE */}

      <h1
        style={{
          textAlign: "center",
          color: "#0f172a",
        }}
      >
        🚑 AI Emergency Traffic &
        Ambulance Route Optimizer
      </h1>

      <p
        style={{
          textAlign: "center",
          fontSize: "18px",
        }}
      >
        🤖 AI Traffic Prediction +
        ETA Prediction +
        Dynamic Rerouting
      </p>

      {/* MAP */}

      <MapContainer
        center={ambulanceStart}
        zoom={13}
        style={{
          height: "550px",
          width: "100%",
          borderRadius: "12px",
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <Marker
          position={ambulancePosition}
          icon={ambulanceIcon}
        >
          <Popup>
            🚨 <b>Emergency Ambulance</b>
            <br />
            AI Dynamic Routing Active
            <br />
            {ambulanceFinished
              ? "🏥 Reached Hospital"
              : "🚑 En Route"}
          </Popup>
        </Marker>

        <Marker position={hospitalPosition}>
          <Popup>
            🏥 <b>Hospital</b>
            <br />
            Emergency Destination
          </Popup>
        </Marker>

        {routes.map((route) => (
          <Polyline
            key={route.routeNumber}
            positions={route.coordinates}
            pathOptions={{
              color: route.isRecommended
                ? "green"
                : route.routeNumber === 2
                ? "orange"
                : "blue",
              weight: route.isRecommended ? 9 : 5,
              opacity: route.isRecommended ? 1 : 0.65,
            }}
          />
        ))}
      </MapContainer>

      {/* MAIN DASHBOARD */}

      <div
        style={{
          padding: "20px",
        }}
      >
        <h2>
          🚨 Emergency Control Dashboard
        </h2>

        {/* LIVE STATUS CARDS */}

        {!loading && routes.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                background: "#dcfce7",
                border: "2px solid #22c55e",
                borderRadius: "12px",
                padding: "15px",
              }}
            >
              <div>🟢</div>
              <b>AI Recommended Route</b>
              <h2 style={{ margin: "8px 0" }}>
                Route {routes[0].routeNumber}
              </h2>
            </div>

            <div
              style={{
                background: "#dbeafe",
                border: "2px solid #3b82f6",
                borderRadius: "12px",
                padding: "15px",
              }}
            >
              <div>⏱️</div>
              <b>Live ETA</b>
              <h2 style={{ margin: "8px 0" }}>
                {liveETA !== null
                  ? liveETA.toFixed(1)
                  : "--"}{" "}
                min
              </h2>
            </div>

            <div
              style={{
                background: "#fff7ed",
                border: "2px solid #f97316",
                borderRadius: "12px",
                padding: "15px",
              }}
            >
              <div>🚦</div>
              <b>Current Traffic</b>
              <h2
                style={{
                  margin: "8px 0",
                  color: getTrafficColor(
                    routes[0].traffic
                  ),
                }}
              >
                {routes[0].traffic}
              </h2>
            </div>

            <div
              style={{
                background: "#ede9fe",
                border: "2px solid #8b5cf6",
                borderRadius: "12px",
                padding: "15px",
              }}
            >
              <div>🔄</div>
              <b>AI Rerouting</b>
              <h2
                style={{
                  margin: "8px 0",
                  color: "#7c3aed",
                }}
              >
                ACTIVE
              </h2>
            </div>
          </div>
        )}

        {/* AUTO UPDATE */}

        <div
          style={{
            backgroundColor: "#e0f2fe",
            border: "2px solid #38bdf8",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "15px",
          }}
        >
          🔄 <b>Dynamic rerouting active every 10 seconds</b>
          <br />
          🕐 <b>Last Updated:</b>{" "}
          {lastUpdated.toLocaleTimeString()}
        </div>

        {/* LOADING */}

        {loading && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#fff7ed",
              border: "2px solid #fb923c",
              borderRadius: "8px",
              marginBottom: "15px",
            }}
          >
            ⏳ <b>AI is recalculating routes...</b>
          </div>
        )}

        {/* GREEN CORRIDOR */}

        {!loading && routes.length > 0 && (
          <div
            style={{
              backgroundColor: "#dcfce7",
              border: "3px solid #16a34a",
              borderRadius: "12px",
              padding: "18px",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                marginTop: "0",
                color: "#166534",
              }}
            >
              🚦 EMERGENCY GREEN CORRIDOR ACTIVE
            </h2>

            <p>
              🚑 <b>Priority Route:</b> Route{" "}
              {routes[0].routeNumber}
            </p>

            <p>
              🏆 <b>AI Reason:</b> Lowest route score
            </p>

            <p>
              ⏱️ <b>AI Predicted ETA:</b>{" "}
              {routes[0].predictedETA} minutes
            </p>

            <p>
              🚨 <b>Live Ambulance Status:</b>{" "}
              {ambulanceFinished
                ? "🏥 Reached Hospital"
                : "🚑 Emergency Transit"}
            </p>

            <p
              style={{
                fontWeight: "bold",
                color: "#166534",
              }}
            >
              🟢 Priority corridor selected by the AI
              route optimizer.
            </p>

            <small>
              *Green Corridor is simulated for the
              hackathon demonstration and does not
              control real traffic signals.
            </small>
          </div>
        )}

        {/* ROUTE CARDS */}

        {!loading &&
          routes.map((route) => (
            <div
              key={route.routeNumber}
              style={{
                border: route.isRecommended
                  ? "3px solid #16a34a"
                  : "2px solid #ddd",
                borderRadius: "12px",
                padding: "18px",
                marginBottom: "15px",
                backgroundColor: route.isRecommended
                  ? "#f0fdf4"
                  : "#ffffff",
                boxShadow:
                  "0 2px 6px rgba(0,0,0,0.08)",
              }}
            >
              <h2>
                {route.isRecommended
                  ? "🟢 🚑 EMERGENCY GREEN CORRIDOR"
                  : `🛣️ Route ${route.routeNumber}`}
              </h2>

              <p>
                📏 <b>Distance:</b>{" "}
                {route.distance.toFixed(2)} km
              </p>

              <p>
                🚗 <b>Vehicles:</b> {route.vehicles}
              </p>

              <p>
                🏎️ <b>Average Speed:</b>{" "}
                {route.speed} km/h
              </p>

              <p>
                🚦 <b>AI Traffic:</b>{" "}
                <span
                  style={{
                    color: getTrafficColor(
                      route.traffic
                    ),
                    fontWeight: "bold",
                  }}
                >
                  {route.traffic}
                </span>
              </p>

              <p>
                ⏱️ <b>AI Predicted ETA:</b>{" "}
                {route.predictedETA} minutes
              </p>

              <p>
                ⚠️ <b>Traffic Penalty:</b>{" "}
                {route.trafficPenalty}
              </p>

              <p>
                🧮 <b>AI Route Score:</b>{" "}
                {route.score}
              </p>

              {route.isRecommended && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor: "#dcfce7",
                    border: "2px solid #22c55e",
                    fontWeight: "bold",
                    fontSize: "17px",
                  }}
                >
                  🚑 ⭐ AI RECOMMENDED ROUTE
                  <br />
                  🚨 Ambulance simulation active
                </div>
              )}
            </div>
          ))}

        {/* CHATBOX */}

        <div
          style={{
            marginTop: "30px",
            backgroundColor: "#ffffff",
            border: "3px solid #7c3aed",
            borderRadius: "15px",
            padding: "20px",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          <h2
            style={{
              color: "#6d28d9",
              marginTop: "0",
            }}
          >
            💬 Mandana AI
            <br />
            <span
              style={{
                fontSize: "16px",
                color: "#555",
                fontWeight: "normal",
              }}
            >
              Emergency Route Assistant
            </span>
          </h2>

          <p>
            Ask about routes, traffic, ETA, safety,
            ambulance location, or Green Corridor.
          </p>

          {/* CHAT MESSAGES */}

          <div
            style={{
              height: "280px",
              overflowY: "auto",
              backgroundColor: "#f8fafc",
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "12px",
              marginBottom: "15px",
            }}
          >
            {chatMessages.map(
              (message, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent:
                      message.sender === "user"
                        ? "flex-end"
                        : "flex-start",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      backgroundColor:
                        message.sender === "user"
                          ? "#dbeafe"
                          : "#ede9fe",
                      border:
                        message.sender === "user"
                          ? "1px solid #93c5fd"
                          : "1px solid #c4b5fd",
                    }}
                  >
                    <b>
                      {message.sender === "user"
                        ? "You"
                        : "🤖 Assistant"}
                    </b>

                    <br />

                    {message.text}
                  </div>
                </div>
              )
            )}
          </div>

          {/* QUICK QUESTIONS */}

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <button
              onClick={() =>
                setChatInput(
                  "Which route is best?"
                )
              }
              style={{
                padding: "8px 12px",
                borderRadius: "20px",
                border:
                  "1px solid #8b5cf6",
                backgroundColor: "#f5f3ff",
                cursor: "pointer",
              }}
            >
              🏆 Best Route?
            </button>

            <button
              onClick={() =>
                setChatInput(
                  "What is the traffic?"
                )
              }
              style={{
                padding: "8px 12px",
                borderRadius: "20px",
                border:
                  "1px solid #8b5cf6",
                backgroundColor: "#f5f3ff",
                cursor: "pointer",
              }}
            >
              🚦 Traffic?
            </button>

            <button
              onClick={() =>
                setChatInput(
                  "What is the ETA?"
                )
              }
              style={{
                padding: "8px 12px",
                borderRadius: "20px",
                border:
                  "1px solid #8b5cf6",
                backgroundColor: "#f5f3ff",
                cursor: "pointer",
              }}
            >
              ⏱️ ETA?
            </button>

            <button
              onClick={() =>
                setChatInput(
                  "Is the Green Corridor active?"
                )
              }
              style={{
                padding: "8px 12px",
                borderRadius: "20px",
                border:
                  "1px solid #8b5cf6",
                backgroundColor: "#f5f3ff",
                cursor: "pointer",
              }}
            >
              🟢 Green Corridor?
            </button>

            <button
              onClick={() =>
                setChatInput(
                  "Where is the ambulance?"
                )
              }
              style={{
                padding: "8px 12px",
                borderRadius: "20px",
                border:
                  "1px solid #8b5cf6",
                backgroundColor: "#f5f3ff",
                cursor: "pointer",
              }}
            >
              🚑 Ambulance?
            </button>
          </div>

          {/* INPUT */}

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(event) =>
                setChatInput(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleChat();
                }
              }}
              placeholder="Ask about the emergency route..."
              style={{
                flex: "1",
                padding: "12px",
                border:
                  "2px solid #c4b5fd",
                borderRadius: "8px",
                fontSize: "15px",
              }}
            />

            <button
              onClick={handleChat}
              style={{
                padding: "12px 20px",
                backgroundColor: "#7c3aed",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ➤ Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;