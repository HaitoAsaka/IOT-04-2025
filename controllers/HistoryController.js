const db = require("../config/db");

// Lấy dữ liệu với phân trang (Trả về pageSize & pageNumber)
exports.getPagedHistory = (req, res) => {
    const { page = 1, pageSize = 5 } = req.query;
    
    // Ép kiểu và đảm bảo giá trị hợp lệ
    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const limit = Math.max(parseInt(pageSize) || 5, 1);
    const offset = (pageNumber - 1) * limit;

    // Đếm tổng số bản ghi trong bảng history_db
    const countQuery = "SELECT COUNT(*) AS totalRecords FROM sensor_db.history_db";
    db.query(countQuery, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalRecords = countResult[0].totalRecords;
        const totalPages = Math.ceil(totalRecords / limit);

        // Truy vấn lấy dữ liệu phân trang
        const query = "SELECT * FROM sensor_db.history_db LIMIT ? OFFSET ?";
        db.query(query, [limit, offset], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                pageNumber,
                pageSize: limit,
                totalRecords,
                totalPages,
                data: results,
            });
        });
    });
};

exports.searchHistoryByDateAndStatus = (req, res) => {
    const { date, status, page = 1, pageSize = 5 } = req.query;

    if (!date && !status) {
        return res.status(400).json({ error: "Vui lòng nhập ít nhất một trong hai tham số: date hoặc status." });
    }

    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const limit = Math.max(parseInt(pageSize) || 5, 1);
    const offset = (pageNumber - 1) * limit;

    let query = "SELECT * FROM sensor_db.history_db WHERE 1=1";
    let countQuery = "SELECT COUNT(*) AS totalRecords FROM sensor_db.history_db WHERE 1=1";
    let queryParams = [];

    if (date) {
        // Kiểm tra xem người dùng có nhập cả ngày và giờ không
        const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/; // Kiểu 2024-02-23 08:55:00
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // Kiểu 2024-02-23

        if (dateTimeRegex.test(date)) {
            // Nếu là dạng "2024-02-23 08:55:00", tìm kiếm chính xác thời gian
            query += " AND time = ?";
            countQuery += " AND time = ?";
        } else if (dateRegex.test(date)) {
            // Nếu là dạng "2024-02-23", tìm kiếm theo ngày (bỏ qua giờ phút giây)
            query += " AND DATE(time) = ?";
            countQuery += " AND DATE(time) = ?";
        } else {
            return res.status(400).json({ error: "Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD hoặc YYYY-MM-DD HH:MM:SS." });
        }
        queryParams.push(date);
    }

    if (status) {
        query += " AND status = ?";
        countQuery += " AND status = ?";
        queryParams.push(status);
    }

    db.query(countQuery, queryParams, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalRecords = countResult[0].totalRecords;
        const totalPages = Math.ceil(totalRecords / limit);

        if (totalRecords === 0) {
            return res.json({
                pageNumber,
                pageSize: limit,
                totalRecords,
                totalPages,
                data: [],
                message: "Không tìm thấy dữ liệu phù hợp.",
            });
        }

        query += " LIMIT ? OFFSET ?";
        queryParams.push(limit, offset);

        db.query(query, queryParams, (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                pageNumber,
                pageSize: limit,
                totalRecords,
                totalPages,
                data: results,
            });
        });
    });
};
// Ghi lại trạng thái đèn (ON/OFF)
exports.insertHistory = (req, res) => {
    const { name, status } = req.body;

    if (!name || !status) {
        return res.status(400).json({ error: "Thiếu name hoặc status" });
    }

    const validStatuses = ["ON", "OFF"];
    if (!validStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({ error: "Status phải là 'ON' hoặc 'OFF'" });
    }

    const query = "INSERT INTO sensor_db.history_db (name, status) VALUES (?, ?)"; // time sẽ tự động lấy CURRENT_TIMESTAMP
    db.query(query, [name, status.toUpperCase()], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(201).json({ message: "Đã lưu lịch sử bật/tắt đèn", insertId: result.insertId });
    });
};


