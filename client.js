// Kết nối MQTT và lưu dữ liệu cảm biến vào DB
const mqtt = require('mqtt');
const db = require('./config/db');

// Cấu hình MQTT
const mqttOptions = {
  host: '192.168.173.147',
  port: 1999,
  username: 'VietLong',
  password: '123456'
};

const topic = 'esp8266/dulieu';

// Kết nối MQTT broker
const client = mqtt.connect(mqttOptions);

// Lưu trạng thái hiện tại của đèn
const ledStatus = {
  den1: 0,
  den2: 0,
  den3: 0
};

// Hàm cập nhật trạng thái đèn khi server gửi lệnh
function updateLedStatus(led, state) {
  if (led === 'full') {
    ['den1', 'den2', 'den3'].forEach(d => {
      ledStatus[d] = state;
    });
  } else if (ledStatus.hasOwnProperty(led)) {
    ledStatus[led] = state;
  }
}

client.on('connect', () => {
  console.log('📡 Đã kết nối MQTT');
  client.subscribe(topic, (err) => {
    if (err) console.error('❌ Lỗi subscribe:', err);
    else console.log(`✅ Subscribed: ${topic}`);
  });
  // và cập nhật ledStatus tại đây.
});

client.on('message', (topic, message) => {
  if (topic === 'esp8266/dulieu') {
    try {
      const data = JSON.parse(message.toString());
      const { temperature, humidity, light } = data;
      const timestamp = new Date(); // thời gian hiện tại

      // Kiểm tra dữ liệu hợp lệ
      if (
        typeof temperature === 'number' &&
        typeof humidity === 'number' &&
        typeof light === 'number'
      ) {
        const sql = `
          INSERT INTO sensor_data (temperature, humidity, light, time)
          VALUES (?, ?, ?, ?)
        `;
        db.query(sql, [temperature, humidity, light, timestamp], (err, result) => {
          if (err) {
            console.error('❌ Insert Error:', err);
          } else {
            console.log(`✅ Dữ liệu đã lưu (ID: ${result.insertId})`);
          }
        });
      } else {
        console.warn('⚠️ Dữ liệu không hợp lệ:', data);
      }
    } catch (err) {
      console.error('❌ JSON Parse Error:', err.message);
    }
  }

  // Nếu bạn subscribe thêm topic trạng thái đèn ở đây, có thể cập nhật ledStatus tương tự
});

// 👉 Export client, ledStatus và hàm update để server.js sử dụng
module.exports = {
  client,
  ledStatus,
  updateLedStatus
};
