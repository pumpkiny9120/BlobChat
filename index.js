const express = require("express");
const app = express();
const PORT = 5000;
const http = require("http");
const socketio = require("socket.io");

app.set("view engine", "ejs");

const server = http.createServer(app);
const io = socketio(server).listen(server);

app.get("/", (req, res) => {
    res.render("index");
});
server.listen(PORT, () => {
    console.log(`Server at ${PORT}`);
});
