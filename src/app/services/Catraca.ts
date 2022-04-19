import { SocketServerService } from './socket-server.service';
const WebSocketServer = (<any>window).electron.require('websocket');
const { sockets } = (<any>window).electron;

import { SqlService } from './sql.service';
const net = (<any>window).electron.require('net');

export class Catraca {
  cliente: any;
  private PORTA = 2050;
  private PORTA_CLIENT = 2051;
  public ipfaceid = '';
  public IP = '';
  public sql: SqlService;
  public socket: SocketServerService;
  public countComandos = 0;
  private ultimoIngresso = '';
  public totalGiros = 0;
  private INIT = [
    '01;07;1;I;1;I;0;1;I;D;0;99;101050;0;03;0;0;0;M;05;0;1;0;02;0;0;0;0;1;I;00;0;05;',
    '01;17;60;      LOBO      ;   DEVELOPERS   ;',
  ];
  public sentido = 0;

  constructor(sql: any, socket: any) {
    this.sql = sql;
    this.socket = socket;
    this.cliente = new net.Socket();
    console.log(this.cliente);
  }

  private addCountComandos() {
    this.countComandos++;
  }

  private rmCountComandos() {
    this.countComandos--;
    if (this.countComandos < 0) this.countComandos = 0;
  }

  
  async conecta(ip: any) {
    this.IP = ip;
    sockets.connect(ip, ()=>{
        sockets.write(ip, this.INIT.map((cmd) => `${cmd}\r`).join(''));
    });
    // this.IP = ip;
    // this.cliente.connect(this.PORTA_CLIENT, ip, this._conectar.bind(this));
    // this.cliente.on('data', this._on.bind(this));
    // this.totalGiros = await this.sql.getTotalCatraca(this.IP);
  }

  stop() {
    sockets.destroy(this.IP);
  }

  private async _on(raw: any) {
    try {
      let str = String(raw);
      console.log(str);
      let cmd = str.split(';');
      this.rmCountComandos();
      if (str == '$') return this._verifica();
      if (cmd[0] + ' ' + cmd[1] == '01 10') {
        switch (cmd[3]) {
          case 'E':
            // await this.sql.updateSentido(this.ultimoIngresso, 1, this.IP);
            break;
          case 'S':
            // await this.sql.updateSentido(this.ultimoIngresso, 0, this.IP);
            break;
          default:
            // await this.sql.updateSentido(0, this.sentido == 0 ? "1" : "0", this.IP);
            break;
        }
        this.ultimoIngresso = '';
        // this.totalGiros = await this.sql.getTotalCatraca(this.IP);
        return true;
      }

      if (cmd[1] + ' ' + cmd[2] == '30 08') {
        let cod = cmd[3];
        this.validaIngresso(cod);
        return true;
      }
    } catch (error) {
      console.error(error);
    }
  }
  private _verifica() {
    this.addCountComandos();
    this.cliente.write('01;19;\r');
  }
  private async _conectar() {
    try {
      console.log(`Conectando... no IP ${this.IP} \n`);
      this.cliente.write(this.INIT.map((cmd) => `${cmd}\r`).join(''));
      // this.totalGiros = await this.sql.getTotalCatraca(this.IP);
    } catch (error) {
      console.error(error);
    }
  }

  async validaIngresso(cod: any) {
    try {
      this.liberarUmGiro();
    } catch (error) {
      console.log(error);
      if (error == 0)
        return this.ingressoBloqueado('LIBERADO APENAS ', '  PARA ENTRAR   ');
      if (error == 1)
        return this.ingressoBloqueado('LIBERADO APENAS ', '   PARA SAIR    ');
      this.ingressoBloqueado();
    }
  }

  ingressoBloqueado(linha1 = ' KING INGRESSOS ', linha2 = '    Bloqueado   ') {
    this.cliente.write(`01;03;05;${linha1};${linha2};\r`);
  }

  liberarUmGiro() {
    // this.addCountComandos();
    // this.cliente.write('01;02;I;05; KING INGRESSOS ;    LIBERADO    ;\r');
    sockets.write(this.IP, '01;02;I;05; KING INGRESSOS ;    LIBERADO    ;\r')
  }
}
