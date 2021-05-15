const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const redis = require("redis");
const redisearch  = require('redis-redisearch');
const PORT = 5000;

// Connects to local Redis and enable Redisearch commands.
const redisClient = redis.createClient();
redisearch(redis);
// Creates Redisearch index if it does not exist.
redisClient.ft_create("posts_idx", "ON", "HASH", "PREFIX", "1", "post", "SCHEMA", "content", "TEXT",
    function (err, response) {
        if (err && err.message !== "Index already exists") throw err;
    });

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
    const username = req.query.username;
    const myPost = req.query.post;
    redisClient.hset(`post_${username}`, "username", username, "content", myPost);
    // Finds matches in Redis.
    const searchString = myPost.split(" ").join(" | ");
    console.log(`Redis: FT.SEARCH posts_idx ${searchString}`);
    redisClient.ft_search("posts_idx", searchString, function (err, data) {
        // Search response looks like
        // [
        //   5, # number of records
        //   'post_user5', # key of first record
        //   [ 'username', 'user5', 'content', 'fox jumps' ], # value of first record
        // ]
        let posts = [];
        let keyCount = data.length - 1;
        // Remove first item (number of records), and parse the rest.
        data.slice(1).map(function (record) {
            if (Array.isArray(record)) {
                let post = {}
                for (let i = 0; i < record.length; i += 2) {
                    post[record[i]] = record[i + 1];
                }
                if (username !== post.username) {
                    posts.push(post);
                }
                // Only when all records are loaded, we will render the webpage.
                keyCount = keyCount -2
                if (keyCount === 0) {
                    res.render('posts', {posts: posts});
                }
            }
        });
    });
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
        if (data.length !== 0) {
            socket.emit("loadFinished");
        }
    });
}

server.listen(PORT, () => {
    console.log(`Server at ${PORT}`);
});
