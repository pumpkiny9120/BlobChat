const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const redis = require("redis");
const PORT = 5000;

// Connects to local Redis.
const redisClient = redis.createClient();
// Sets up application.
const app = express();
app.set("view engine", "ejs");
// Hosts css files from public directory.
app.use(express.static('public'));
const server = http.createServer(app);
const io = socketio(server).listen(server);

// Index page for making a post.
app.get("/", (req, res) => {
    res.render("index");
});

// Posts page for viewing matched posts and selecting a user.
app.get('/posts', (req, res) =>  {
    const posts = [{
        username: 'user1',
        content: 'It is a nice day out there'
    }];
    console.log(posts)
    res.render('posts', {posts: posts});
});

// Chat page for... chatting.
app.get("/chat", (req, res) => {
    const username = req.query.username;

    io.emit("join", username);
    res.render("chat", { username });
});

io.on("connection", socket => {
    loadExistingMessages(socket);

    socket.on("message", ({ message, from }) => {
        console.log(message, from);

        // Save the message to Redis
        redisClient.rpush("messages", `${from}:${message}`);
        // Reset TTL to 60 seconds
        // TODO check if it's the same person who sent the last message.
        redisClient.expire("messages", 60);
        io.emit("message", { message, from });
    });
});

function loadExistingMessages(socket) {
    redisClient.lrange("messages", "0", "-1", (err, data) => {
        data.map(x => {
            const usernameMessage = x.split(":");
            const redisUsername = usernameMessage[0];
            const redisMessage = usernameMessage[1];

            socket.emit("message", {
                message: redisMessage,
                from: redisUsername
            });
        });
        if (data.length != 0) {
            socket.emit("loadFinished");
        }
    });
}

server.listen(PORT, () => {
    console.log(`Server at ${PORT}`);
});
