const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "123456", // Thay bằng mật khẩu MySQL của bạn
    database: "sensor_db"
});

db.connect((err) => {
    if (err) {
        console.error("Lỗi kết nối MySQL:", err);
        return;
    }
    console.log("Kết nối MySQL thành công!");
});

module.exports = db;
