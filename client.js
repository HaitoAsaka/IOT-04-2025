// client.js – Kết nối MQTT và lưu dữ liệu cảm biến + trạng thái đèn vào DB
const mqtt = require('mqtt');
const db = require('./config/db');
const mqttAckCallbacks = require('./mqttCallbacks'); // Import đúng cách

// Cấu hình MQTT
const mqttOptions = {
  host: '192.168.24.3',
  port: 1999,
  username: 'VietLong',
  password: '123456'
};

const client = mqtt.connect(mqttOptions);

// Các topic cần subscribe
const sensorTopic = 'esp8266/dulieu';
const ledStatusTopic = 'esp8266/led_status';

// Lưu trạng thái hiện tại của đèn
const ledStatus = {
  den1: 0,
  den2: 0,
  den3: 0
};

// Khởi tạo trạng thái đèn mới nhất mặc định (ban đầu chưa có dữ liệu)
let ledStatusLatest = {
  den1: 'Tắt',
  den2: 'Tắt',
  den3: 'Tắt',
  tempAlert: false,
  humidAlert: false,
  lightAlert: false,
  lastUpdated: null
};

// Hàm chuẩn hóa trạng thái đèn
function normalizeLedState(value) {
  // Nếu giá trị là số 1, chuỗi "1", chuỗi "Bật" (không phân biệt hoa thường), hoặc true thì trả "Bật"
  if (
    value === 1 ||
    value === '1' ||
    (typeof value === 'string' && value.toLowerCase() === 'bật') ||
    value === true
  ) {
    return 'Bật';
  }
  // Ngược lại trả "Tắt"
  return 'Tắt';
}

// Hàm cập nhật trạng thái đèn khi server gửi lệnh
function updateLedStatus(led, state) {
  if (led === 'full') {
    ['den1', 'den2', 'den3'].forEach((d) => {
      ledStatus[d] = state;
    });
  } else if (ledStatus.hasOwnProperty(led)) {
    ledStatus[led] = state;
  }
}

client.on('connect', () => {
  console.log('📡 Đã kết nối MQTT');
  client.subscribe([sensorTopic, ledStatusTopic], (err) => {
    if (err) {
      console.error('❌ Lỗi subscribe:', err);
    } else {
      console.log(`✅ Subscribed: ${sensorTopic}, ${ledStatusTopic}`);
    }
  });
});

client.on('message', (topic, message) => {
  const msg = message.toString();
  console.log(`[MQTT] Nhận trên topic ${topic}:`, msg);

  // Xử lý dữ liệu cảm biến
  if (topic === sensorTopic) {
    try {
      const data = JSON.parse(msg);
      const { temperature, humidity, light } = data;
      const timestamp = new Date();

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
            console.error('❌ Lỗi khi lưu dữ liệu cảm biến:', err);
          } else {
            console.log(`✅ Đã lưu cảm biến (ID: ${result.insertId})`);
          }
        });
      } else {
        console.warn('⚠️ Dữ liệu cảm biến không hợp lệ:', data);
      }
    } catch (err) {
      console.error('❌ Lỗi khi parse JSON cảm biến:', err.message);
    }
    return;
  }

  // Xử lý trạng thái đèn từ ESP8266
  if (topic === ledStatusTopic) {
    try {
      const ledData = JSON.parse(msg);

      if (
        ledData &&
        typeof ledData === 'object' &&
        'den1' in ledData &&
        'den2' in ledData &&
        'den3' in ledData
      ) {
        // Chuẩn hóa trạng thái đèn
        ledStatusLatest = {
          den1: normalizeLedState(ledData.den1),
          den2: normalizeLedState(ledData.den2),
          den3: normalizeLedState(ledData.den3),
          tempAlert: ledData.tempAlert ?? false,
          humidAlert: ledData.humidAlert ?? false,
          lightAlert: ledData.lightAlert ?? false,
          lastUpdated: new Date()
        };

        console.log('💡 Trạng thái đèn mới nhất:', ledStatusLatest);

        // Gọi callback cho từng đèn nếu có, truyền trạng thái đã chuẩn hóa
        ['den1', 'den2', 'den3'].forEach((led) => {
          if (
            mqttAckCallbacks[led] &&
            typeof mqttAckCallbacks[led].resolve === 'function'
          ) {
            const resolvedStatus = normalizeLedState(ledData[led]); // chuẩn hóa
            console.log(`🟢 Gọi callback cho ${led} với giá trị chuẩn hóa:`, resolvedStatus);
            mqttAckCallbacks[led].resolve(resolvedStatus);
            clearTimeout(mqttAckCallbacks[led].timeoutId);
            delete mqttAckCallbacks[led];
          } else if (mqttAckCallbacks[led]) {
            console.error(`❌ Lỗi callback cho ${led}:`, mqttAckCallbacks[led]);
          }
        });
      } else {
        console.warn('⚠️ Dữ liệu trạng thái đèn không hợp lệ:', ledData);
      }
    } catch (err) {
      console.error('❌ Lỗi khi parse JSON trạng thái đèn:', err.message);
      console.error('Payload nhận được:', msg);
    }
    return;
  }
});

// Export cho các file khác dùng
module.exports = {
  client,
  ledStatus,
  updateLedStatus,
  ledStatusLatest
};
