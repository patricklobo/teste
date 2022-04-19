const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const os = require('os');

const FILEBASE = os.homedir() + '/base-ingressos.db';
if (!fs.existsSync(FILEBASE))fs.writeFileSync(FILEBASE, "");

const db = new sqlite3.Database(FILEBASE);

const query = (sql, params = []) => {
    return new Promise((sucesso, falha)=>{
      db.all(sql, params, (err, rows)=>{
        if(err) falha(err)
        else sucesso(rows)
      })
    })
  }

  const init = async () => {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS config (
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL
        )
    `);

      await query(`
        CREATE TABLE IF NOT EXISTS catracas (
          ip TEXT NOT NULL,
          entrada INTEGER NOT NULL,
          saida INTEGER NOT NULL
        )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_catraca_cont ON catracas (ip);
    `);

      let log1 = await query(`
        CREATE TABLE IF NOT EXISTS ingressos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          idingresso TEXT NOT NULL UNIQUE,
          cod TEXT NOT NULL,
          status INTEGER NOT NULL,
          evento TEXT NOT NULL,
          link TEXT NOT NULL,
          link_vacina TEXT,
          nome_portador TEXT,
          sentido INTEGER NOT NULL,
          imagem INTEGER NOT NULL
        )
    `); 
    await query(`
        CREATE TABLE IF NOT EXISTS movimentacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idingresso TEXT NOT NULL,
        sentido INTEGER NOT NULL,
        datahora TEXT,
        catraca TEXT,
        sync INTEGER DEFAULT 0
        )
    `);
    let log2 = await query(`
      CREATE INDEX IF NOT EXISTS idx_catraca ON movimentacao (catraca);
    `);
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

init();

module.exports = query;