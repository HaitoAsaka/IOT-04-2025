const mqtt = require('mqtt');
const mysql = require('mysql2');
const db = require("./config/db");

// MQTT configuration (từ Arduino code)
const mqttOptions = {
  host: '192.168.24.101',
  port: 1999,
  username: 'VietLong',
  password: '123456'
};
const topic = 'esp8266/dulieu';

// Kết nối MQTT
const client = mqtt.connect(mqttOptions);

client.on('connect', () => {
  console.log('Connected to MQTT broker!');
  client.subscribe(topic, (err) => {
    if (err) {
      console.error('MQTT Subscribe error:', err);
    } else {
      console.log(`Subscribed to topic "${topic}"`);
    }
  });
});

// Nhận dữ liệu từ ESP8266
client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const { temperature, humidity, light } = data;
    const timestamp = new Date(); // lấy thời gian hiện tại

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
          console.error('Insert Error:', err);
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
});
