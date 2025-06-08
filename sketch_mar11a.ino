#include <ESP8266WiFi.h>         
#include <PubSubClient.h>        
#include <DHT.h>                 
#include <ArduinoJson.h>         

// Thông tin WiFi
// const char* ssid = "Haito";    
// const char* password = "igpr6781";
const char* ssid = "XL-P204";    
const char* password = "0982417272";

// Thông tin MQTT
const char* mqtt_server = "192.168.24.3";
const int mqtt_port = 1999;
const char* mqtt_user = "VietLong"; 
const char* mqtt_pass = "123456"; 

// Khai báo các chân kết nối
#define DHTPIN D4   // Chân DHT11 (GPIO2)
#define DHTTYPE DHT11
#define LDR_PIN A0  // Chân cảm biến ánh sáng
#define LED_D1 D1   // Chân LED 1
#define LED_D2 D2   // Chân LED 2
#define LED_D3 D3   // Chân LED 3
#define LED_TEMP_ALERT D6  // Chân cảnh báo nhiệt độ
#define LED_HUMID_ALERT D7 // Chân cảnh báo độ ẩm
#define LED_LIGHT_ALERT D8 // Chân cảnh báo ánh sáng

// Ngưỡng cảnh báo
#define TEMP_THRESHOLD_HIGH 30.0  // Nhiệt độ cao cảnh báo
#define HUMID_THRESHOLD_HIGH 80.0 // Độ ẩm cao cảnh báo
#define LIGHT_THRESHOLD_HIGH 600   // Ánh sáng cao cảnh báo

// Biến trạng thái cảnh báo
bool tempAlert = false;
bool humidAlert = false;
bool lightAlert = false;

unsigned long previousMillis = 0;
const long blinkInterval = 500; // Tốc độ nhấp nháy (ms)

// Khai báo biến toàn cục để lưu trạng thái đèn
bool den1State = false;
bool den2State = false;
bool den3State = false;

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

// Kết nối WiFi
void setup_wifi() {
  Serial.print("Đang kết nối WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Đã kết nối WiFi!");
}

// Hàm đọc trạng thái đèn hiện tại và gửi về server
void publishLedStates() {
  // Đọc trạng thái hiện tại
  den1State = digitalRead(LED_D1) == HIGH;
  den2State = digitalRead(LED_D2) == HIGH;
  den3State = digitalRead(LED_D3) == HIGH;
  
  // Tạo JSON chứa trạng thái đèn
  StaticJsonDocument<256> ledDoc;
  ledDoc["den1"] = den1State ? "Bật" : "Tắt";
  ledDoc["den2"] = den2State ? "Bật" : "Tắt";
  ledDoc["den3"] = den3State ? "Bật" : "Tắt";
  ledDoc["tempAlert"] = tempAlert;
  ledDoc["humidAlert"] = humidAlert;
  ledDoc["lightAlert"] = lightAlert;
  
  char ledBuffer[256];
  serializeJson(ledDoc, ledBuffer);
  
  // Gửi trạng thái đèn về server
  client.publish("esp8266/led_status", ledBuffer);
  Serial.print("Gửi trạng thái đèn: ");
  Serial.println(ledBuffer);
}

void controlLED(int pin, bool state) {
  digitalWrite(pin, state ? HIGH : LOW);
  Serial.printf("Đèn trên chân %d đã được %s\n", pin, state ? "Bật" : "Tắt");
  delay(100); // Thêm độ trễ nhỏ để đảm bảo phần cứng đã cập nhật
  publishLedStates(); // Gửi trạng thái mới thực tế
}
// Xử lý tin nhắn MQTT nhận được

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Nhận từ MQTT: ");
  Serial.print(topic);
  Serial.print(" - Giá trị: ");

  String msg = "";
  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.println(msg);

  int state = msg.toInt();  // Chuyển chuỗi "0" hoặc "1" thành số

  if (strcmp(topic, "esp/den1") == 0) {
    controlLED(LED_D1, state);
  }
  else if (strcmp(topic, "esp/den2") == 0) {
    controlLED(LED_D2, state);
  }
  else if (strcmp(topic, "esp/den3") == 0) {
    controlLED(LED_D3, state);
  }
  else if (strcmp(topic, "esp/full") == 0) {
    controlLED(LED_D1, state);
    controlLED(LED_D2, state);
    controlLED(LED_D3, state);
  }
}

// Kết nối lại MQTT nếu mất kết nối
void reconnect() {
  while (!client.connected()) {
    Serial.print("Đang kết nối MQTT...");
    if (client.connect("ESP8266Client", mqtt_user, mqtt_pass)) {
      Serial.println(" Thành công!");
      client.subscribe("esp/den1");
      client.subscribe("esp/den2");
      client.subscribe("esp/den3");
      client.subscribe("esp/full");
    } else {
      Serial.print(" Lỗi, mã: ");
      Serial.print(client.state());
      Serial.println(" Thử lại sau 5s...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  pinMode(LED_D1, OUTPUT);
  pinMode(LED_D2, OUTPUT);
  pinMode(LED_D3, OUTPUT);
  pinMode(LED_TEMP_ALERT, OUTPUT);
  pinMode(LED_HUMID_ALERT, OUTPUT);
  pinMode(LED_LIGHT_ALERT, OUTPUT);

  digitalWrite(LED_D1, LOW);
  digitalWrite(LED_D2, LOW);
  digitalWrite(LED_D3, LOW);
  digitalWrite(LED_TEMP_ALERT, LOW);
  digitalWrite(LED_HUMID_ALERT, LOW);
  digitalWrite(LED_LIGHT_ALERT, LOW);

  dht.begin();
  delay(100);
  publishLedStates();
}

// Biến để theo dõi thời gian gửi trạng thái đèn
unsigned long lastLedStatusUpdate = 0;
const long ledStatusInterval = 2000;
unsigned long previousSensorUpdate = 0;
const long sensorInterval = 2000; // Gửi dữ liệu cảm biến mỗi 2 giây

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long currentMillis = millis();

  // Xử lý nhấp nháy đèn cảnh báo
  if (currentMillis - previousMillis >= blinkInterval) {
    previousMillis = currentMillis;
    
    // Nhấp nháy đèn cảnh báo nhiệt độ
    if (tempAlert) {
      digitalWrite(LED_TEMP_ALERT, !digitalRead(LED_TEMP_ALERT));
    } else {
      digitalWrite(LED_TEMP_ALERT, LOW);
    }
    
    // Nhấp nháy đèn cảnh báo độ ẩm
    if (humidAlert) {
      digitalWrite(LED_HUMID_ALERT, !digitalRead(LED_HUMID_ALERT));
    } else {
      digitalWrite(LED_HUMID_ALERT, LOW);
    }
    
    // Nhấp nháy đèn cảnh báo ánh sáng
    if (lightAlert) {
      digitalWrite(LED_LIGHT_ALERT, !digitalRead(LED_LIGHT_ALERT));
    } else {
      digitalWrite(LED_LIGHT_ALERT, LOW);
    }
  }

  // Gửi dữ liệu cảm biến mỗi 3 giây
  if (currentMillis - previousSensorUpdate >= sensorInterval) {
    previousSensorUpdate = currentMillis;

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    int lightValue = analogRead(LDR_PIN);

    if (!isnan(temperature) && !isnan(humidity)) {
      // Cập nhật trạng thái cảnh báo
      
      // Nhiệt độ cảnh báo khi >= ngưỡng cao
      if (temperature >= TEMP_THRESHOLD_HIGH) {
        tempAlert = true;
      } else {
        tempAlert = false;
      }

      // Độ ẩm cảnh báo khi >= ngưỡng cao, tắt khi dưới ngưỡng
      if (humidity >= HUMID_THRESHOLD_HIGH) {
        humidAlert = true;
      } else {
        humidAlert = false;
      }

      // Ánh sáng cảnh báo khi > ngưỡng cao, tắt khi <= ngưỡng
      if (lightValue > LIGHT_THRESHOLD_HIGH) {
        lightAlert = true;
      } else {
        lightAlert = false;
      }

      // Tạo JSON gửi dữ liệu
      StaticJsonDocument<200> sensorDoc;
      sensorDoc["temperature"] = temperature;
      sensorDoc["humidity"] = humidity;
      sensorDoc["light"] = lightValue;

      char sensorBuffer[200];
      serializeJson(sensorDoc, sensorBuffer);

      // Gửi dữ liệu lên topic esp8266/dulieu
      client.publish("esp8266/dulieu", sensorBuffer);
      Serial.print("📤 Gửi dữ liệu cảm biến: ");
      Serial.println(sensorBuffer);
    } else {
      Serial.println("⚠️ Không đọc được dữ liệu từ cảm biến DHT");
    }
  }
}


