const { contextBridge, ipcRenderer, ipcMain, shell } = require("electron");
const settings = require("electron-settings");
const net = require("net");
const fs = require("fs");
const https = require("https");
const http = require("http");
const os = require("os");
const sharp = require("sharp");
const socket = require("./websocket");
const { fromPath } = require("pdf2pic");
const spawn = require("child_process").spawn;


// const websocket = require('websocket');
// const { localStorage, sessionStorage } = require('electron-browser-storage');
const db = require("./db");
var express = require("express");
var bodyParser = require("body-parser");
var server = express();
const DIR = os.homedir() + "/fotosKing";

const PORTA_CLIENT = 2051;

const getDataTv = (evento, ingresso) => {
  let dir = `${DIR}/${evento}/${ingresso}.jpg`;
  if (!fs.existsSync(dir)) throw "Foto não existe";
  let image = fs.readFileSync(dir, "base64");
  let dirVacina = `${DIR}/${evento}/${ingresso}-vacina.jpg`;
  if (!fs.existsSync(dir)) throw "Foto não existe";
  let vacina = fs.readFileSync(dirVacina, "base64");
  return JSON.stringify({ image, vacina });
};

const downloadMainVacina = (link = "", dest = "") => {
  return new Promise((sucesso, falha) => {
    let ext = "";
    try {
      // console.log("Link vacina", link);
      ext = link.split("?")[0].substr(-3);
      ext = ext == "pdf" ? "pdf" : "jpg";
      // console.log(ext);
    } catch (error) {
      console.log(error);
    }
    let file = fs.createWriteStream(dest + "." + ext);
    https
      .get(link, function (response) {
        response.pipe(file);
        file.on("finish", function () {
          file.close();
          sucesso(true);
        });
      })
      .on("error", function (err) {
        console.log(link, dest, err);
        try {
          fs.unlinkSync(dest);
        } catch (error) {
          console.log(error);
        }
        falha("download");
      });
  });
};
const downloadMain = (link = "", dest = "") => {
  return new Promise((sucesso, falha) => {
    let file = fs.createWriteStream(dest);
    https
      .get(link, function (response) {
        response.pipe(file);
        file.on("finish", function () {
          file.close();
          let output = dest + ".resize." + dest.substr(-3);
          sharp(dest)
            .resize(1024)
            .toFile(output, (err, info) => {
              if (err) throw err;
              fs.unlinkSync(dest);
              fs.renameSync(output, dest);
              sucesso(true);
            });
        });
      })
      .on("error", function (err) {
        try {
          console.log(err);
          fs.unlinkSync(dest);
        } catch (error) {
          console.log(error);
        }
        alert(`Erro no download ada imagem ${dest}`);
        falha("download");
      });
  });
};

const getIdIngresso = async (ingresso = "") => {
  try {
    let value = await db(`SELECT id FROM ingressos WHERE idingresso = ? `, [
      ingresso,
    ]);
    return value[0]?.id;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const pdfToImagemVacinacao = async (evento = "") => {
  let dir = `${DIR}/${evento}`;
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(async (file) => {
      let ext = file.substr(-3).toLowerCase();
      if (ext == "pdf") {
        // console.log(file);
        try {
          let path = `${dir}/${file}`;
          let index = file.indexOf(".pdf");
          let newname = file.substr(0, index);
          const options = {
            density: 100,
            saveFilename: newname,
            savePath: dir,
            format: "jpg",
            width: 600,
            height: 1000,
          };
          const storeAsImage = fromPath(path, options);
          // console.log(path, storeAsImage);
          const pageToConvertAsImage = 1;
          storeAsImage(pageToConvertAsImage).then((resolve) => {
            // console.log("Page 1 is now converted as image");
            let index = path.indexOf(".pdf");
            let newname = path.substr(0, index);
            fs.unlinkSync(path);
            fs.renameSync(newname + ".1.jpg", newname + ".jpg");
            console.log("pdf to image generation -> " + newname + ".jpg");
            return resolve;
          });
        } catch (error) {
          console.log(error);
        }
      }

      // fs.unlinkSync(`${dir}/${file}`)
    });
  }
  console.log(`PdfToImagemVacinacao evento: ${evento}`);
};

// ipcMain.on('asynchronous-message', (event, arg) => {
//   console.log('tesasdte') // prints "ping";
// })

const sockets = {
  list: {},
  faceids: {},
  catraca: null,
  write(ip, data) {
    sockets.list[ip].write(data);
  },
  destroy(ip) {
    sockets.list[ip].destroy();
  },
  setFaceId(ip, ipcatraca, evento, catraca) {
    sockets.faceids[ip] = {
      liberaGirgo: catraca,
      ipcatraca: ipcatraca,
      evento,
    };
  },
  connect(ip, init, catraca) {
    sockets.list[ip] = new net.Socket();
    sockets.list[ip].connect(PORTA_CLIENT, ip, function () {
      console.log("Connected");
      init();
    });
    sockets.list[ip].on("data", function (data) {
      console.log("Received: " + data);
      // sockets.list[ip].destroy(); // kill client after server's response
    });

    sockets.list[ip].on("close", function () {
      console.log("Connection closed");
    });
  },
};

const startServer = () => {
  server.use(bodyParser.urlencoded({ extended: false, limit: "50mb" }));

  // parse application/json
  server.use(bodyParser.json({ limit: "50mb" }));

  server.post("/libera", async (req, res) => {
    try {
      console.log("Executou!");
      if (req.body.personId != "STRANGERBABY") {
        console.log(req.body.ip);
        try {
          sockets.faceids[req.body.ip].liberaGirgo(req.body);
          let { ipcatraca, evento } = sockets.faceids[req.body.ip];
          let idingress = await getIdIngresso(req.body.personId);
          let data = getDataTv(evento, idingress);
          socket.sendData(ipcatraca, data);
          // getDataTv
        } catch (error) {
          console.log(error);
        }
        //
        // console.log(ipcRenderer.sendSync('synchronous-message', 'ping'))
      }
    } catch (error) {
      console.log(error);
    }
    res.status(200);
    res.json({});
  });

  server.get("/tv", (req, res) => {
    fs.readFile(__dirname + "/servertv/index.html", "utf8", (err, text) => {
      res.send(text);
    });
  });

  const srv = server.listen(3000);
  socket.init(srv);
  console.log("Server online port 3000");
};

contextBridge.exposeInMainWorld("electron", {
  lobo: 123123,
  db,
  net,
  fs,
  https,
  sockets,
  socket,
  os,
  shell,
  settings,
  startServer,
  spawn,
  downloadMain,
  downloadMainVacina,
  pdfToImagemVacinacao,
  require: require,
  //   doThing: () => ipcRenderer.sendToHost("do-a-thing"),
});
startServer();

//version teste