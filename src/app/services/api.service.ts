import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UtilService } from './util.service';
import { ConfigService } from './config.service';

const tokencatraca = 'S0lOR0lOR1JFU1NPUy1DQVRSQUNBU0NPTlRST0xMRVI=';

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    catraca: tokencatraca,
  }),
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  endpoint = '';
  constructor(public http: HttpClient, private util: UtilService, public config: ConfigService) {
    this.endpoint = this.util.isDev()
      ? 'http://localhost:4000'
      // ? 'http://172.20.10.11:4000'
      // ? 'http://10.0.3.55:4000'
      : 'https://api.kingingressos.com';
  }

  private post(url = "", query = ""){
    return this.http.post(this.endpoint + url, {query}, httpOptions).toPromise();
  }

  private get(url = ""){
    return this.http.get(this.endpoint + url, httpOptions).toPromise();
  }

  getEventos(data = ""){
    return this.post("", `
    query {
      eventosCatracas(data: "${data}"){
        id
        titulo
        data
      }
    }
    `);
  }

  getIngressos(evento = "", limite = 10){
    return this.post("", `
    mutation {
      getIngressosCatracas(
        evento: "${evento}"
        limite: ${limite}
      ) {
        id
        cod
        evento
        link
        link_vacina
        nome_portador
        status
      }
    }
    `);
  }

  resetEvento(evento = ""){
    return this.post("", `
    mutation {
      resetEventoCatraca(evento: "${evento}") 
    }
    `);
  }

  getTotalIngressos(evento = ""){
    return this.post("", `
    query {
      eventoCount(evento: "${evento}") {
        total
      }
    }
    `);
  }

  syncIngressos(lista = []){
    return this.post(`/v1/private/ingressos/sincronizar`, `[${lista.join()}]`);
  }

}
