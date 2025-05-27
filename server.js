const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const dataController = require("./controllers/DataController");
const historyController = require("./controllers/HistoryController");
const { client: mqttClient, ledStatus, updateLedStatus } = require("./client");

const app = express();
app.use(cors());
app.use(express.json());

// API từ DataController
app.get("/api/sensors", dataController.getPagedData);
app.get("/api/searchByTime", dataController.searchByTime);
app.get("/api/searchAndSort", dataController.searchAndSort);
app.get("/api/chart-data", dataController.getChartData);
app.get("/api/latest-sensor", dataController.getLatestSensorData);

// API từ HistoryController
app.get("/api/history", historyController.getPagedHistory);
app.get("/api/history/search", historyController.searchHistoryByDateAndStatus);

// API trả trạng thái đèn
app.get("/api/led-status", (req, res) => {
  res.json(ledStatus);
});

// API điều khiển đèn qua MQTT
// Ánh xạ tên kỹ thuật -> tên hiển thị trong DB
const ledNameMap = {
  den1: "đèn xanh",
  den2: "đèn vàng",
  den3: "đèn đỏ"
};

app.post("/api/led", (req, res) => {
  const { led, state } = req.body;

  const allowedLeds = ["den1", "den2", "den3", "full"];
  if (!allowedLeds.includes(led) || ![0, 1].includes(state)) {
    return res.status(400).json({ error: "LED hoặc trạng thái không hợp lệ" });
  }

  const topic = `esp/${led}`;
  mqttClient.publish(topic, String(state), (err) => {
    if (err) {
      console.error("❌ Lỗi gửi MQTT:", err);
      return res.status(500).json({ error: "Không thể gửi lệnh điều khiển" });
    }

    console.log(`🔁 Gửi MQTT: ${topic} → ${state}`);
    updateLedStatus(led, state);

    // 📝 Ghi log vào DB nếu không phải 'full'
    if (led !== "full") {
      const name = ledNameMap[led] || led;
      const statusStr = state === 1 ? "bật" : "tắt";

      const query = "INSERT INTO sensor_db.history_db (name, status, time) VALUES (?, ?, NOW())";
      db.query(query, [name, statusStr], (err) => {
        if (err) {
          console.error("❌ Lỗi ghi log trạng thái đèn:", err);
        } else {
          console.log(`📝 Đã ghi log: ${name} → ${statusStr}`);
        }
      });
    }

    res.json({ success: true, topic, state });
  });
});

// Trang chủ test API
app.get("/", (req, res) => {
  res.send("Server đang chạy! API hoạt động bình thường.");
});

// Chạy server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
