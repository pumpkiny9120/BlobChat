const fs = require('fs');
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const redis = require("redis");
const redisearch = require('redis-redisearch');
const PORT = 5000;

// Connects to local Redis and enable RediSearch commands.
const redisClient = redis.createClient();
redisearch(redis);
// Creates RediSearch index if it does not exist.
console.log(`Redis: FT.CREATE posts_idx ON HASH PREFIX 1 post SCHEMA content TEXT`)
redisClient.ft_create("posts_idx", "ON", "HASH", "PREFIX", "1", "post", "SCHEMA", "content", "TEXT",
    function (err, response) {
        if (err && err.message !== "Index already exists") throw err;
    });

// Loads sample posts into Redis.
let rawPosts = fs.readFileSync('./public/sample_posts.json');
let jsonPosts = JSON.parse(rawPosts);
jsonPosts.map(item => {
    const username = item.username;
    const content = item.content;
    // Saves user's post to Redis.
    console.log(`Redis: HSET post_${username} username ${username} content "${content}"`);
    redisClient.hset(`post_${username}`, "username", username, "content", content);
})

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
app.get('/posts', (req, res) => {
    const username = req.query.username;
    const myPost = req.query.post;
    // Saves user's post to Redis.
    console.log(`Redis: HSET post_${username} username ${username} content "${myPost}"`);
    redisClient.hset(`post_${username}`, "username", username, "content", myPost);
    // Finds similar posts in Redis.
    const searchString = myPost.split(" ").join(" | ");
    console.log(`Redis: FT.SEARCH posts_idx "${searchString}"`);
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
                let post = {};
                for (let i = 0; i < record.length; i += 2) {
                    post[record[i]] = record[i + 1];
                }
                // But not this user's own post.
                if (username !== post.username) {
                    posts.push(post);
                }
                // Only when all records are loaded, we will render the webpage.
                keyCount = keyCount - 2
                if (keyCount === 0) {
                    res.render('posts', {username: username, posts: posts});
                }
            }
        });
    });
});

// Chat page for... chatting.
app.get("/chat", (req, res) => {
    const username = req.query.username;
    const matched = req.query.matched;

    io.emit("join", username);
    res.render("chat", {username, matched});
});

// Message bus.
io.on("connection", socket => {
    loadExistingMessages(socket);

    socket.on("message", ({message, from, to}) => {
        // Sorts the usernames so the Redis key stays the same regardless of who sent the message.
        const sortedUsernames = [from, to];
        sortedUsernames.sort();
        //const redisKey = `messages_${sortedUsernames[0]}_${sortedUsernames[1]}`;
        const redisKey = "messages"
        const redisValue = `${from}:${to}:${message}`;
        // Saves the new message to the end of the message list in Redis.
        console.log(`Redis: RPUSH ${redisKey} ${redisValue}`);
        redisClient.rpush(`${redisKey}`, `${redisValue}`);
        // Resets TTL to 60 seconds.
        console.log(`Redis: EXPIRE ${redisKey} 60`);
        redisClient.expire(`${redisKey}`, 60);
        io.emit("message", {message, from, to});
    });
});

function loadExistingMessages(socket) {
    console.log("Redis: LRANGE messages 0 -1");
    redisClient.lrange("messages", "0", "-1", (err, data) => {
        data.map(x => {
            const messageSections = x.split(":");
            const from = messageSections[0];
            const to = messageSections[1];
            const message = messageSections[2];

            socket.emit("message", {
                message: message,
                from: from,
                to: to
            });
        });
        if (data.length !== 0) {
            socket.emit("loadFinished");
        }
    });
}

server.listen(PORT, () => {
    console.log(`Server stared at ${PORT}.`);
});
