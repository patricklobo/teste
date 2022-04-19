import { Component, OnInit, isDevMode } from '@angular/core';
import { FormControl, FormGroup, SelectControlValueAccessor } from '@angular/forms';
import * as dayjs from 'dayjs';
import { ApiService } from './services/api.service';
import { SqlService } from './services/sql.service';
import { FaceidService } from './services/faceid.service';
import { Catraca } from './services/Catraca';
import { UtilService } from './services/util.service';
import { ConfigService } from './services/config.service';

const { sockets, startServer, shell, spawn, isDev, pdfToImagemVacinacao } = (<any>window).electron;
const settings = (<any>window).electron.require('electron-settings');
const fs = (<any>window).electron.require('fs');
const os = (<any>window).electron.require('os');

const FILEBASE = os.homedir() + '/fileteste.txt';
const DOWNLOADPORVEZ = 10;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'Controle de Acesso';
  constructor(
    private api: ApiService,
    private sql: SqlService,
    private util: UtilService,
    private config: ConfigService,
    private faceid: FaceidService
  ) {
    
  }

  faceids = 0;
  baixados = 0;
  nolocal = 0;
  total = 0;
  pendentes = 0;

  ultimoupdate:any = null;

  countIngressosSemFoto = 0;
  countIngressosBaixados = 0;

  evento: any = null;

  formData = new FormGroup({
    catracas: new FormControl(''),
    data: new FormControl(''),
    evento: new FormControl(),
  });

  catracaSockets: any = {};

  eventos: any = [];
  catracas: any = [];
  catracasReload: any = [];
  loading = false;
  loadingFotos = false;
  loadingCatraca = false;
  async _setCatracas(catracas: any) {
    try {
      let _catracas = catracas
        .split('\n')
        .map((i: any) => i.trim())
        .filter((i: any) => i);
      if (!fs.existsSync(FILEBASE)) fs.writeFileSync(FILEBASE, '');
      await this.sql.setItem('catracas', JSON.stringify(_catracas));
      this.catracas = _catracas;
    } catch (error) {
      console.log(error);
    }
  }

  async setCatracas() {
    try {
      let catracas = this.formData.controls.catracas.value;
      this._setCatracas(catracas);
    } catch (error) {
      console.log(error);
    }
  }
  async getCatracas() {
    try {
      let item = await this.sql.getItem('catracas');
      this.catracas = JSON.parse(item || '[]');
    } catch (error) {
      console.log(error);
    }
  }

  ngOnInit(): void {
    let now = dayjs().format('YYYY-MM-DD');
    this.formData.controls.data.setValue(now);

    if(this.util.isDev()){
      this.formData.controls.data.setValue('2022-06-28');
      this.formData.controls.catracas.setValue(
        '192.168.0.100\n192.168.0.144'
        // '192.168.0.100\n192.168.0.101\n192.168.0.102\n192.168.0.103'
      );
    }
    this.getCatracas();
    this.init().then();
  }

  openTv(ip = ""){
    spawn("open", [
      "-na",          // Argument for cmd.exe to carry out the specified script
      "Google Chrome", // Path to your file
      "--args", // Path to your file
      "--new-window", // Path to your file
      `--profile-directory="${ip}"`, // Path to your file
      `http://localhost:3000/tv?${ip};0`, // Path to your file
      // "argument1",   // First argument
      // "argumentN"    // n-th argument
  ]);
    // shell.openExternal(`open -a "Google Chrome"`);
    // shell.openExternal(`http://localhost:3000/tv?${ip};0`);
  }

  async init() {
    try {
      let _evento = await this.sql.getItem('evento');
      if (_evento) {
        this.evento = JSON.parse(_evento);
        // await pdfToImagemVacinacao(this.evento.id);
      }
      await this.getEventos();
      await this.updateTotais();
    } catch (error) {
      console.log(error);
    }
  }


  async resetContagem(){
    try {
      if(this.evento){
        let hash = "contagem_" + this.evento.id;
        await this.sql.setItem(hash, String(0));
        return 0;
      }
      return 0;
    } catch (error) {
      console.log(error);
    }
    return 0;
  }
  async updateContagem(inc = 0){
    try {
      if(this.evento){
        let hash = "contagem_" + this.evento.id;
        let data = await this.sql.getItem(hash);
        data = Number(data) || 0;
        data += inc;
        await this.sql.setItem(hash, String(data));
        // console.log(data);
        return data;
      }
      return 0;
    } catch (error) {
      console.log(error);
    }
    return 0;
  }


  async updateTotais() {
    if(this.evento) {
      console.log("loop totais...");
      try {
        let totais:any = await this.sql.getTotalEvento(this.evento.id);
        this.faceids = totais?.totalIngressos[0]?.total;
        this.baixados = totais?.totalFotos[0]?.total;
        this.nolocal = totais?.totalDentro[0]?.total;
        this.total = await this.updateContagem(0);
        let resp:any = await this.api.getTotalIngressos(this.evento.id);
        let totalServer = resp?.data?.eventoCount?.total || 0;
        this.pendentes = totalServer - this.faceids;
      } catch (error) {
        console.log(error);
      }
      this.ultimoupdate = new Date();
    }
    setTimeout(()=>{
      this.updateTotais().then();
    }, 1000);
    return true;
  }

  async getEventos() {
    this.loading = true;
    try {
      let data = this.formData.controls.data.value;
      let eventos: any = await this.api.getEventos(data);
      this.eventos = eventos?.data?.eventosCatracas;
      console.log(this.eventos);
    } catch (error) {
      console.log(error);
    }
    this.loading = false;
  }

  async getIngressos() {
    this.loading = true;
    try {
      let _ingressos: any = await this.api.getIngressos(this.evento.id, 99999);
      let ingressos = _ingressos?.data?.getIngressosCatracas || [];
      await this.sql.reset(this.evento._id);
      for (let i of ingressos) {
        if(!i.link || !i.link_vacina){
          alert(`Cliente ${i.nome_portador} sem foto ou cartão de vacina`);
        }
        await this.sql.insertIngressos(i.id, i.id, this.evento.id, i.link, i.status, i.link_vacina, i.nome_portador);
      }
    } catch (error) {
      console.log(error);
    }
    this.loading = false;
  }

  async buscar() {
    this.loading = true;
    try {
      let { value } = this.formData;
      let _ingressos: any = await this.api.getIngressos(value.evento, 99999);
      let ingressos = _ingressos?.data?.getIngressosCatracas || [];
      let evento = this.eventos.find((i: any) => i.id == value.evento);
      await this.sql.reset(value.evento);
      for (let i of ingressos) {
        if(!i.link || !i.link_vacina){
          alert(`Cliente ${i.nome_portador} sem foto ou cartão de vacina`);
        }
        await this.sql.insertIngressos(i.id, i.id, evento.id, i.link, i.status,  i.link_vacina, i.nome_portador);
      }
      console.log(evento);
      await this.sql.setItem('evento', JSON.stringify(evento));
      this.evento = evento;
      console.log(ingressos);
    } catch (error) {
      console.log(error);
    }
    this.loading = false;
  }

  async sync(){
    try {
      await this.getIngressos();
      await this.dwnloadAllImagens();
    } catch (error) {
      alert("Erro ao executar o sync, verifique sua internet, se persistir consulte o suporte.");
    }
  }

  async dwnloadAllImagens() {
    this.loadingFotos = true;
    try {
      let ingressos = await this.sql.getIngressoSemFoto();
      this.countIngressosSemFoto = ingressos.length;
      let downloads = [];
      let count = 0;
      this.countIngressosBaixados = 0;
      for (let i of ingressos) {
        downloads.push(this.sql.downloadFoto(this.evento.id, i, this.catracas));
        count++;
        this.countIngressosBaixados++;
        if (downloads.length == DOWNLOADPORVEZ || count == ingressos.length) {
          console.log('Baixando...', count);
          await Promise.all(downloads);
          downloads = [];
          console.log('baixado!');
        }
      }
      try {
        await pdfToImagemVacinacao(this.evento.id);
      } catch (error) {
        console.log(error);
      }
      this.countIngressosBaixados = 0;
      this.countIngressosSemFoto = 0;
      console.log(ingressos);
    } catch (error) {
      console.log(error);
    }
    this.loadingFotos = true;
  }

  resetCatraca() {
    let is = confirm('Deseja remover todas as catracas?');
    if (is) {
      this._setCatracas('');
    }
  }

  liberaUmGiro(ip: any) {
    this.catracaSockets[ip].liberarUmGiro();
  }

  onlyCatracas() {
    return this.catracasReload.filter((item: any, index: any) => index % 2 == 0);
  }

  async reloadCatracas() {
    let isCon = false;
    this.loadingCatraca = true;
    try {
      let count = 0;
      for (let i of this.catracas) {
        if (count % 2 == 0) {
          try {
            if(this.catracaSockets[i]) isCon = true;
            this.catracaSockets[i].stop();
            this.catracaSockets[i] = null;
          } catch (error) {
            console.log(error);
          }
        }
        count++;
      }
      if(isCon) this.catracasReload = this.catracas;
      if(!isCon){
        this.catracasReload = [];
        count = 0;
        for (let i of this.catracas) {
          if (count % 2 == 0) {
            this.catracaSockets[i] = new Catraca(this.sql, {});
            this.catracaSockets[i].conecta(i);
            console.log(i);
          } 
          count++;
        }
      }
    } catch (error) {
      console.log(error);
    }
    this.loadingCatraca = false;
  }
  async reloadCatracasFaceIds() {
        let count = 0;
        for (let i of this.catracas) {
          if (!(count % 2 == 0)) {
            if(this.evento){
              let ip = this.catracas[count - 1];
              this.catracaSockets[ip].ipfaceid = i;
              sockets.setFaceId(i, ip, this.evento.id, async (body:any = {}) => {
                console.log('Giro liberado');
                console.log(body);
                try {
                  await this.sql.updateSentido(body.personId, 1, body.ip);
                  await this.updateContagem(1);
                } catch (error) {
                  console.log(error);
                }
                this.catracaSockets[ip].liberarUmGiro();
              });
              await this.faceid.configuraRetorno(i);
            }
          }
          count++;
        }
  }

  async resetFaceId() {
    this.loadingCatraca = true;
    try {
      let is = confirm(
        'Deseja resetar todos os FaceIds? Esse procedimento não pode ser desfeito.'
      );
      if (is) {
        let count = 0;
        for (let i of this.catracas) {
          if (count % 2 != 0) {
            let ip = this.catracas[count - 1];
            this.catracaSockets[ip].ipfaceid = i;
            await this.faceid.resetDevice(i);
          }
          count++;
        }
      }
    } catch (error) {
      console.log(error);
    }
    this.loadingCatraca = false;
  }

  async resetEvento() {
    this.loading = true;
    try {
      let is = confirm(
        'Deseja apagar TUDO para iniciar um novo evento? Esse procedimento não pode ser desfeito.'
      );
      if (is) {
        await this.resetContagem();
        this.sql.removePastaEvento(this.evento.id);
        await this.api.resetEvento(this.evento.id);
        this.sql.setItem('evento', '');
        this.evento = null;
      }
    } catch (error) {
      console.log(error);
    }
    this.loading = false;
  }
}
