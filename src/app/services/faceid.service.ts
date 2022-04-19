import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpHeaders } from '@angular/common/http';

const PORT = 8090;
const PASS = '12345678';
const DEVICEIP = '192.168.0.146';
const SERVERIP = '192.168.0.118';
const SERVERPORT = '3000';

@Injectable({
  providedIn: 'root',
})
export class FaceidService extends ApiService {
  async sendCommands(ip: any, command: any, query: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
    };
    try {
      let urlcommand = `http://${ip}:${PORT}/${command}`;
      console.log('faceid -> ' + urlcommand);
      let resp = await this.http
        .post(urlcommand, query, httpOptions)
        .toPromise();
      console.log(resp);
      return resp;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async setFoto(ip = '', id = '', nome = '', fotoBase64 = '', idfoto = '') {
    let msg = `Uma ou mais fotos não poderam ser enviadas ao FaceId ${ip}`;
    try {
      let person = {
        id: id,
        name: nome,
      };
      let body = `pass=${PASS}&person=${JSON.stringify(person)}`;
      let resp: any = await this.sendCommands(
        ip || DEVICEIP,
        'person/create',
        body
      );
      if (!resp.success) alert(msg);
      let form = new URLSearchParams();
      try {
        form = new URLSearchParams();
        form.set('pass', PASS);
        form.set('faceId', id);
        resp = await this.sendCommands(ip || DEVICEIP, 'face/delete', form);
        if(resp.success) console.log(`face ${id} deletada!`);
      } catch (error) {}
      form = new URLSearchParams();
      form.set('pass', PASS);
      form.set('personId', id);
      form.set('faceId', id);
      form.set('imgBase64', fotoBase64);
      resp = await this.sendCommands(ip || DEVICEIP, 'face/create', form);
      if (!resp.success) alert(`Foto: ${idfoto} | ` + msg);
    } catch (error) {
      alert(msg);
    }
    return true;
  }

  async resetDevice(ip = '') {
    let form = new URLSearchParams();
    form.set('pass', PASS);
    await this.sendCommands(ip || DEVICEIP, 'device/reset', form);
  }

  // async resetDevice(ip = '') {
  //   let form = new URLSearchParams();
  //   form.set('pass', "12345678");
  //   await this.post("http://ipdodevice:porta/device/reset", form);
  // }

  async configuraRetorno(ip = '') {
    let form = new URLSearchParams();
    form.set('pass', PASS);
    form.set('callbackUrl', `http://${SERVERIP}:${SERVERPORT}/libera`);
    await this.sendCommands(ip || DEVICEIP, 'setIdentifyCallBack', form);

    form = new URLSearchParams();
    form.set('pass', PASS);
    form.set('isTemperatureOpen', "2");
    form.set('errorTemperature', "37.3");
    await this.sendCommands(ip || DEVICEIP, 'setTemperatureConfig', form);

    form = new URLSearchParams();
    form.set('pass', PASS);
    form.set('isMaskOpen', "2");
    form.set('isVoiceOpen', "2");
    await this.sendCommands(ip || DEVICEIP, 'setMaskConfig', form);

    form = new URLSearchParams();
    form.set('pass', PASS);
    form.set(
      'config',
      JSON.stringify({
        saveIdentifyMode: 0,
        companyName: 'CAMAROTE DO KING',
      })
    );
    await this.sendCommands(ip || DEVICEIP, 'setConfig', form);
  }
}
