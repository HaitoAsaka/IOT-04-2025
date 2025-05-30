const mqtt = require('mqtt');
const db = require('./config/db');

// Cấu hình MQTT
const mqttOptions = {
  host: '192.168.24.3',
  port: 1999,
  username: 'VietLong',
  password: '123456'
};

const SENSOR_TOPIC = 'esp8266/dulieu';
const LED_TOPIC = 'esp8266/led_status';

// Kết nối đến MQTT Broker
const client = mqtt.connect(mqttOptions);

// Trạng thái hiện tại của đèn
const ledStatus = {
  den1: 'Tắt',
  den2: 'Tắt',
  den3: 'Tắt',
  tempAlert: false,
  humidAlert: false,
  lightAlert: false
};

// Hàm cập nhật trạng thái đèn từ server gửi lệnh (nếu cần dùng ở nơi khác)
function updateLedStatus(led, state) {
  if (led === 'full') {
    ['den1', 'den2', 'den3'].forEach(d => {
      ledStatus[d] = state ? 'Bật' : 'Tắt';
    });
  } else if (ledStatus.hasOwnProperty(led)) {
    ledStatus[led] = state ? 'Bật' : 'Tắt';
  }
}

// Hàm trả về trạng thái hiện tại để dùng ở nơi khác (như API frontend)
function getLedStatus() {
  return ledStatus;
}

// Sự kiện khi kết nối thành công
client.on('connect', () => {
  console.log('📡 MQTT đã kết nối');
  client.subscribe([SENSOR_TOPIC, LED_TOPIC], (err) => {
    if (err) console.error('❌ Lỗi khi subscribe:', err);
    else console.log(`✅ Subscribed các topic: ${SENSOR_TOPIC}, ${LED_TOPIC}`);
  });
});

// Xử lý khi có dữ liệu mới từ MQTT
client.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());

    if (topic === SENSOR_TOPIC) {
      const { temperature, humidity, light } = payload;
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
          if (err) console.error('❌ Lỗi lưu sensor:', err);
          else console.log(`✅ Dữ liệu đã lưu (ID: ${result.insertId})`);
        });
      } else {
        console.warn('⚠️ Sensor data không hợp lệ:', payload);
      }
    }

    if (topic === LED_TOPIC) {
      const { den1, den2, den3, tempAlert, humidAlert, lightAlert } = payload;

      // Cập nhật trạng thái led hiện tại
      ledStatus.den1 = den1 || 'Tắt';
      ledStatus.den2 = den2 || 'Tắt';
      ledStatus.den3 = den3 || 'Tắt';
      ledStatus.tempAlert = !!tempAlert;
      ledStatus.humidAlert = !!humidAlert;
      ledStatus.lightAlert = !!lightAlert;

      console.log('💡 Trạng thái đèn cập nhật:', ledStatus);
    }
  } catch (err) {
    console.error('❌ Lỗi parse JSON MQTT:', err.message);
  }
});

// Export cho phần khác của hệ thống sử dụng
module.exports = {
  client,
  ledStatus,
  updateLedStatus,
  getLedStatus
};
