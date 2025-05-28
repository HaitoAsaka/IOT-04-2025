
const mqttAckCallbacks = {
  den1: (status) => {
    console.log("✅ Callback mqttAck - den1:", status);
    fetchLedStatusAndUpdateUI();
  },
  den2: (status) => {
    console.log("✅ Callback mqttAck - den2:", status);
    fetchLedStatusAndUpdateUI();
  },
  den3: (status) => {
    console.log("✅ Callback mqttAck - den3:", status);
    fetchLedStatusAndUpdateUI();
  },
};
module.exports = {};
