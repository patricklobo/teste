import { Injectable } from '@angular/core';
import { FaceidService } from './faceid.service';
const { db, net, os, ipcRenderer, downloadMain, downloadMainVacina } = (<any>window).electron;
const http = (<any>window).electron.require('https');
const fs = (<any>window).electron.require('fs');
const axios = (<any>window).electron.require('axios');
const { Buffer } = (<any>window).electron.require('buffer');
const DIR = os.homedir() + '/fotosKing';

@Injectable({
  providedIn: 'root',
})
export class SqlService {
  constructor(
    private faceid: FaceidService
  ) {}

  async setItem(key = '', value = '') {
    try {
      let op = await db(
        `INSERT OR REPLACE INTO config 
      (
        key, 
        value
        ) 
    VALUES (
      ?,
      ?
    ) `,
        [key, value]
      );
      // console.log(op);
    } catch (error) {
      console.log(error);
    }
  }

  
  async getItem(key = '') {
    try {
      let value = await db(`SELECT value FROM config WHERE key = ? `, [key]);
      return value[0]?.value;
    } catch (error) {
      console.log(error);
    }
  }

  async getIngressoSemFoto() {
    try {
      let value = await db(
        `SELECT id, idingresso, link, link_vacina, nome_portador, imagem FROM ingressos WHERE imagem = 0 `,
        []
      );
      return value;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async insertIngressos(id = '', cod = '', evento = '', link = '', status = 0, link_vacina = "", nome_portador = "") {
    try {
      if (!link || link == 'null') link = 'https://i.imgur.com/8qvOxqg.png';
      await db(
        `INSERT OR REPLACE INTO ingressos 
            (
              idingresso, 
              cod,
              evento, 
              link,
              status,
              link_vacina,
              nome_portador,
              sentido,
              imagem
              ) 
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            0,
            0
          ) `,
        [id, cod, evento, link, status, link_vacina, nome_portador]
      );
      return true;
    } catch (error) {
      console.error(
        {
          id,
          cod,
          evento,
          link,
          status,
        },
        error
      );
      throw error;
    }
  }

  async reset(evento = '') {
    try {
      await db(
        `DELETE FROM movimentacao 
           WHERE id IN (
             SELECT M.id FROM movimentacao M
             JOIN ingressos I ON I.idingresso = M.idingresso 
             WHERE I.evento = ? 
           )
           `,
        [evento]
      );
      await db(`DELETE FROM ingressos WHERE evento = ? `, [evento]);
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  wait(time: any) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, time);
    });
  }

  getFoto(evento: any, ingresso: any) {
    let dir = `${DIR}/${evento}/${ingresso}.jpg`;
    if (!fs.existsSync(dir)) throw 'Foto não existe';
    return fs.readFileSync(dir, 'base64');
  }

  async downloadFoto(evento: any, item: any, catracas = []) {
    try {
      if (!item.link) return true;
      let dir = `${DIR}/${evento}`;
      if (!fs.existsSync(DIR)) fs.mkdirSync(DIR);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      console.log(`Baixando foto idingresso: ${item.id}`);
      let dirFoto = `${dir}/${item.id}.jpg`;
      let dirVacina = `${dir}/${item.id}-vacina`;
      if (fs.existsSync(dirFoto)) fs.unlinkSync(dirFoto);
      try {
        await downloadMainVacina(item.link_vacina, dirVacina);
      } catch (error) {
        console.log(error);
      }
      await this.download(item.link, dirFoto);
      
      await this.updateImage(item.idingresso, 1);
      let base64 = fs.readFileSync(dirFoto, 'base64');
      try {
        let count = 0;
        for (let i of catracas) {
          console.log(i);
          if (!(count % 2 == 0)) {
            let ip = catracas[count];
            let nome = item.nome_portador.split(" ")[0];
            await this.faceid.setFoto(ip, item.idingresso, nome, base64, dirFoto);
          }
          count++;
        }
      } catch (error) {
        console.log(error);
      }
      
      return true;
    } catch (error) {
      console.log(error);
      console.warn(
        item.link,
        typeof item.link,
        `Falha no download da imagem ${item.link}, tentar novamente em 5 segundos...`
      );
      await this.wait(5000);
      this.downloadFoto(evento, item);
      return true;
    }
  }
  async updateImage(id:any, value:any){
    try {
      console.log("update", id, value);
      await db(
          `UPDATE ingressos SET imagem = ? WHERE idingresso = ?`, [value, id]);
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  download(link = '', dest = '') {
    return downloadMain(link, dest);
  }

  removePastaEvento(evento = "") {
    let dir = `${DIR}/${evento}`;
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach((file:any) => {
        console.log(file);
        fs.unlinkSync(`${dir}/${file}`)
      })
      fs.rmdirSync(dir);
    };
    console.log(`Deletou a pasta do evento: ${evento}`)
  }

  async updateSentido(id:any, value:any, catraca = ""){
    try {
      await db(
          `UPDATE ingressos SET sentido = ? WHERE idingresso = ?`, [value, id]);
      await db(
        `INSERT INTO movimentacao 
        (
          idingresso,
          sentido,
          datahora,
          catraca 
        )
        VALUES
        (
          ?,
          ?,
          DATETIME('now','localtime'),
          ?
        )
        `, 
        [id, value, catraca]
      );
      
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getTotalEvento(evento:any){
    
    try {
     let totalIngressos = await db(
          `SELECT count(idingresso) AS total FROM ingressos WHERE evento = ? AND status = 1 `, [evento]);
     let totalFotos = await db(
          `SELECT count(idingresso) AS total FROM ingressos WHERE evento = ? AND status = 1  AND imagem = 1`, [evento]);
     let totalDentro = await db(
          `SELECT count(idingresso) AS total FROM ingressos WHERE evento = ? AND status = 1 AND sentido = 1 `, [evento]);
    //  let totalEntrada = await db(
    //       `SELECT count(id) AS total FROM movimentacao WHERE idingresso IN (
    //         SELECT idingresso FROM ingressos WHERE evento = ?
    //       ) AND sentido = 1 `, [evento]);
    //  let totalSaida = await db(
    //       `SELECT count(id) AS total FROM movimentacao WHERE idingresso IN (
    //         SELECT idingresso FROM ingressos WHERE evento = ?
    //       ) AND sentido = 0 `, [evento]);

      // console.log("getTotalEvento");
      return {totalIngressos, totalFotos, totalDentro};
    } catch (error) {
      console.error(error);
      throw error;
    }
    return [];
  }
}


