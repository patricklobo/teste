import { Injectable } from '@angular/core';
const WebSocketServer = (<any>window).electron.require('websocket');
const http = (<any>window).electron.http;
const os = (<any>window).electron.os;

@Injectable({
  providedIn: 'root'
})
export class SocketServerService {
  PORTA = 1337;
  IP = "";
  server:any;
  wsServer:any;
  tvs = {};

  constructor() {
    let interfaces = os.networkInterfaces();
    let addresses = [];
    for (let k in interfaces) {
      for (let k2 in interfaces[k]) {
        let address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
          addresses.push(address.address);
        }
      }
    }
    this.IP = addresses[0];
  }
  
  stop(){
    // this.wsServer.terminate();
    this.server.close();
  }

  init() {
    this.server = http.createServer(function (request:any, response:any) {
    });
    this.server.listen(this.PORTA, function () { });

    this.wsServer = new WebSocketServer({
      httpServer: this.server
    });

    let that:any = this;

    this.wsServer.on('request', function (request:any) {
      var connection = request.accept(null, request.origin);
      console.log(request);
      connection.on('message', function (message:any) {
        if (message.type === 'utf8') {
          let msg = message.utf8Data;
          console.log(msg);
          that.tvs[msg] = connection;
        }
      });

      connection.on('close', function (connection:any) {
        console.log("Conexão finalizada");
      });
    });
    
    console.warn(`Iniciando SocketServer...\n${this.IP}:${this.PORTA}`);
  }
}
