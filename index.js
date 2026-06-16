const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const config = require("./settings.json");
const mineflayer = require("mineflayer");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

let bot;
let botStatus = "Disconnected";
let chatLogs = [];

function createBot() {
  if (bot) {
    bot.removeAllListeners();
    try {
      bot.end();
    } catch (e) {}
  }

  botStatus = "Connecting...";
  io.emit("status", botStatus);

  // هنا فين تلبات النسخة 1.21 بزز باش ما يعاودش يعطيك خطأ الـ Logs
  bot = mineflayer.createBot({
    host: config.server.ip,
    port: parseInt(config.server.port),
    username: config["bot-account"].username,
    version: "1.21", 
    auth: "offline"
  });

  bot.on("login", () => {
    botStatus = "Logging in...";
    io.emit("status", botStatus);
  });

  bot.on("spawn", () => {
    botStatus = "Connected";
    io.emit("status", botStatus);
    log(`[Bot] Spawning successfully at ${config.server.ip}`);
  });

  bot.on("chat", (username, message) => {
    log(`[Chat] <${username}> ${message}`);
  });

  bot.on("error", (err) => {
    log(`[Error] ${err.message}`);
  });

  bot.on("end", (reason) => {
    botStatus = "Disconnected";
    io.emit("status", botStatus);
    log(`[Disconnect] Bot disconnected: ${reason}`);
    setTimeout(createBot, 5000);
  });
}

function log(msg) {
  const time = new Date().toLocaleTimeString();
  const formattedMsg = `[${time}] ${msg}`;
  chatLogs.push(formattedMsg);
  if (chatLogs.length > 100) chatLogs.shift();
  io.emit("log", formattedMsg);
}

io.on("connection", (socket) => {
  socket.emit("status", botStatus);
  socket.emit("logs", chatLogs);
});

createBot();

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
