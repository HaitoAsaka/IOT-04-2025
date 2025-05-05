const db = require("../config/db");

// Lấy dữ liệu với phân trang
exports.getPagedData = (req, res) => {
    const { page = 1, pageSize = 5 } = req.query;
    const offset = (page - 1) * pageSize;

    // Đếm tổng số bản ghi
    const countQuery = "SELECT COUNT(*) AS totalRecords FROM sensor_data";
    db.query(countQuery, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalRecords = countResult[0].totalRecords;
        const totalPages = Math.ceil(totalRecords / pageSize);

        // Truy vấn lấy dữ liệu theo phân trang
        const query = "SELECT * FROM sensor_data LIMIT ? OFFSET ?";
        db.query(query, [parseInt(pageSize), parseInt(offset)], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                pageNumber: parseInt(page),
                pageSize: parseInt(pageSize),
                totalRecords: totalRecords,
                totalPages: totalPages,
                data: results,
            });
        });
    });
};

// Tìm kiếm theo thời gian cố định
exports.searchByTime = (req, res) => {
    const { time, page = 1, pageSize = 5 } = req.query;
    const offset = (page - 1) * pageSize;

    // Kiểm tra nếu không có tham số `time`
    if (!time) {
        return res.status(400).json({ error: "Vui lòng nhập thời gian cần tìm theo mẫu (YYYY-MM-DD HH:MM:SS)." });
    }

    // Đếm tổng số bản ghi phù hợp
    const countQuery = "SELECT COUNT(*) AS totalRecords FROM sensor_data WHERE time = ?";
    db.query(countQuery, [time], (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalRecords = countResult[0].totalRecords;
        const totalPages = Math.ceil(totalRecords / pageSize);

        // Truy vấn dữ liệu theo phân trang
        const query = "SELECT * FROM sensor_data WHERE time = ? LIMIT ? OFFSET ?";
        db.query(query, [time, parseInt(pageSize), parseInt(offset)], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                pageNumber: parseInt(page),
                pageSize: parseInt(pageSize),
                totalRecords: totalRecords,
                totalPages: totalPages,
                data: results,
            });
        });
    });
};


// Tìm kiếm theo nhiệt độ, độ ẩm, ánh sáng & sắp xếp
exports.searchAndSort = (req, res) => {
    const { 
        temperature, 
        humidity, 
        light, 
        time,  // Thêm tham số time
        sortField = "time", 
        order = "ASC", 
        page = 1, 
        pageSize = 5 
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    let baseQuery = "FROM sensor_data WHERE 1=1";
    const params = [];

    if (time) {
        baseQuery += " AND time LIKE ?";
        params.push(`%${time}%`);
    }
    if (temperature) {
        baseQuery += " AND temperature = ?";
        params.push(temperature);
    }
    if (humidity) {
        baseQuery += " AND humidity = ?";
        params.push(humidity);
    }
    if (light) {
        baseQuery += " AND light = ?";
        params.push(light);
    }

    // Đếm tổng số bản ghi phù hợp
    const countQuery = `SELECT COUNT(*) AS totalRecords ${baseQuery}`;
    db.query(countQuery, params, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalRecords = countResult[0].totalRecords;
        const totalPages = Math.ceil(totalRecords / pageSize);

        // Truy vấn dữ liệu theo phân trang & sắp xếp
        const query = `SELECT * ${baseQuery} ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`;
        db.query(query, [...params, parseInt(pageSize), parseInt(offset)], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                pageNumber: parseInt(page),
                pageSize: parseInt(pageSize),
                totalRecords: totalRecords,
                totalPages: totalPages,
                data: results,
            });
        });
    });
};

// http://localhost:5000/api/sensors?page=1&pageSize=5
// http://localhost:5000/api/searchByTime?startTime=2024-02-22T00:00:00.000Z&endTime=2024-02-23T23:59:59.999Z
// http://localhost:5000/api/searchAndSort?temperature=30.5&sortField=temperature&order=DESC
