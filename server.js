const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const dataController = require("./controllers/DataController"); 
const historyController = require("./controllers/HistoryController"); // Import đúng tên biến

const app = express();
app.use(cors());
app.use(express.json());

// Định nghĩa API từ DataController
app.get("/api/sensors", dataController.getPagedData);
app.get("/api/searchByTime", dataController.searchByTime);
app.get("/api/searchAndSort", dataController.searchAndSort);

// Định nghĩa API từ HistoryController
app.get("/api/history", historyController.getPagedHistory);
app.get("/api/history/search", historyController.searchHistoryByDateAndStatus);


app.get("/", (req, res) => {
    res.send("Server đang chạy! API hoạt động bình thường.");
});

// Chạy server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
