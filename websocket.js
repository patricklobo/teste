const WebSocket = require("ws");

const sockets = {};

function onError(ws, err) {
  console.error(`onError: ${err.message}`);
}

function onMessage(ws, data) {
    try {
        let ip = String(data).split("ip;")[1];
        sockets[ip] = ws;
        console.log("TV -> ", ip);
    } catch (error) {
        console.log(error);
    }
  console.log(`onMessage: ${data}`);
  ws.send(`{}`);
}

function onConnection(ws, req) {
  ws.on("message", (data) => onMessage(ws, data));
  ws.on("error", (error) => onError(ws, error));
  console.log(`onConnection`);
}

module.exports = {
    init: (server) => {
        const wss = new WebSocket.Server({
          server,
        });
      
        wss.on("connection", onConnection);
      
        console.log(`App Web Socket Server is running!`);
        return wss;
      },
    sendData(ip, data){
        try {
            sockets[ip].send(data);
        } catch (error) {
            console.log(error);
        }
    }
};
