const express = require("express");
const app = express();
const PORT = 5000;
const http = require("http");
const socketio = require("socket.io");

const redis = require("redis");
const client = redis.createClient();

app.set("view engine", "ejs");

const server = http.createServer(app);
const io = socketio(server).listen(server);

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/chat", (req, res) => {
    const username = req.query.username;

    io.emit("joined", username);
    res.render("chat", { username });
});

server.listen(PORT, () => {
    console.log(`Server at ${PORT}`);
});
