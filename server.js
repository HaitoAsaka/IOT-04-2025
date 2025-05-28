const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const dataController = require("./controllers/DataController");
const historyController = require("./controllers/HistoryController");
const {
  client: mqttClient,
  ledStatus,
  updateLedStatus,
  ledStatusLatest
} = require("./client");

const app = express();
app.use(cors());
app.use(express.json());

// Tạm lưu callback chờ phản hồi MQTT
const mqttAckCallbacks = require('./mqttCallbacks');


// API từ DataController
app.get("/api/sensors", dataController.getPagedData);
app.get("/api/searchByTime", dataController.searchByTime);
app.get("/api/searchAndSort", dataController.searchAndSort);
app.get("/api/chart-data", dataController.getChartData);
app.get("/api/latest-sensor", dataController.getLatestSensorData);

// API từ HistoryController
app.get("/api/history", historyController.getPagedHistory);
app.get("/api/history/search", historyController.searchHistoryByDateAndStatus);

// API trả trạng thái đèn hiện tại
app.get("/api/led-status", (req, res) => {
  res.json(ledStatusLatest);
});


// Ánh xạ tên đèn kỹ thuật → tên hiển thị để lưu log
const ledNameMap = {
  den1: "đèn xanh",
  den2: "đèn vàng",
  den3: "đèn đỏ"
};

// API điều khiển đèn (chờ phản hồi MQTT trước khi trả kết quả)
app.post("/api/led", (req, res) => {
  const { led, state } = req.body;

  const allowedLeds = ["den1", "den2", "den3"];
  if (!allowedLeds.includes(led) || ![0, 1].includes(state)) {
    return res.status(400).json({ success: false, message: "LED hoặc trạng thái không hợp lệ" });
  }

  const topic = `esp/${led}`;
  mqttClient.publish(topic, String(state), (err) => {
    if (err) {
      console.error("❌ Lỗi gửi MQTT:", err);
      return res.status(500).json({ success: false, message: "Không thể gửi lệnh điều khiển" });
    }

    console.log(`📤 Gửi MQTT: ${topic} → ${state}`);
    updateLedStatus(led, state);

    // Tạo promise chờ phản hồi từ esp8266/led_status
    const ackPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        delete mqttAckCallbacks[led];
        reject(new Error("MQTT phản hồi quá chậm"));
      }, 5000); // timeout 5 giây

      mqttAckCallbacks[led] = { resolve, timeoutId };
    });

    ackPromise
      .then((updatedState) => {
        // Ghi log vào history_db
        const name = ledNameMap[led] || led;
        const statusStr = updatedState === "Bật" ? "bật" : "tắt";

        const query = "INSERT INTO sensor_db.history_db (name, status, time) VALUES (?, ?, NOW())";
        db.query(query, [name, statusStr], (err) => {
          if (err) {
            console.error("❌ Lỗi ghi log trạng thái đèn:", err);
          } else {
            console.log(`📝 Đã ghi log: ${name} → ${statusStr}`);
          }
        });

        res.json({
          success: true,
          topic,
          state: updatedState,
          ledStatus: ledStatusLatest
        });
      })
      .catch((err) => {
        console.error("❌ Timeout MQTT:", err.message);
        res.status(504).json({ success: false, message: "Timeout phản hồi từ ESP8266" });
      });
  });
});


// Trang chủ test
app.get("/", (req, res) => {
  res.send("Server đang chạy! API hoạt động bình thường.");
});

// Chạy server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});

// 👉 Export mqttAckCallbacks để client.js gọi khi có phản hồi

