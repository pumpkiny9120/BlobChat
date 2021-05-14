# Blob

A minimalist and elegant chat app.


icon is created via https://blobs.app/?e=6&gw=6&se=3&g=eecda3|ef629f&o=0

# Rules of Blobbing

**Rule #1**
Make a post and talk about anything you want, and let Blob finds you 3 matches. See their post and decides if you both want to start chatting.  
**Rule #2**
Chat for as long as you wish until there's no new response from either party for longer than 3 days.  
**Rule #3**
You can only have up to 3 connections at a time.

# Technology Used

**Python/FastApi**  
FastApi is a backend service framework built in Python.  
**RedisMods**  
This project uses **RedisJson** to store posts, connections and chat messages, **RedisAI** and **RedisSearch** to index and explore potential matches.

# Build Locally

Clone the repo to your local directory and start the application
```
docker-compose build
# 1. Start the Redis server
docker-compose up -d
# 2. Start the chat client (with nodemon)
npm run start
```
This will spin up 3 Docker containers:
- `client`: the chat client for the demo.
- `redismod`: the Redis db as storage.
- `redis-insight`: an UI providing some insights of how data is stored in Redis.

> For the simplicity of the demonstration, user registration is omitted and some data are pre-populated.

To test as an existing user, select a user from the list:

- Blob 1: about to make their first post and find a match.
- Blob 2: enjoying a fun conversation with a newly-made friend.
- Blob 3: a chat is about to expire because it got boring eventually.

# Redis Command Explained


## Posts
**SET** When user creates a new post, store the content with the user id.  
**??** Split the user post into ngrams and index in RedisSearch.  
**??** Search for existing posts in RedisSearch and user RedisAI to find similarities.

127.0.0.1:6379> FT.CREATE posts_idx ON HASH PREFIX 1 post SCHEMA content TEXT
OK
127.0.0.1:6379> HSET post_1 content "brown fox jumps over the fence."
(integer) 1
127.0.0.1:6379> FT.SEARCH posts_idx "fox"
1) (integer) 1
2) "post_1"
3) 1) "content"
   2) "brown fox jumps over the fence."
127.0.0.1:6379> FT.SEARCH posts_idx "the"
1) (integer) 0
127.0.0.1:6379> FT.SEARCH posts_idx "hello"
1) (integer) 0
127.0.0.1:6379> FT.SEARCH posts_idx "my fox is brown"
1) (integer) 0
127.0.0.1:6379> FT.SEARCH posts_idx "brown"
1) (integer) 1
2) "post_1"
3) 1) "content"
   2) "brown fox jumps over the fence."
127.0.0.1:6379> FT.SEARCH posts_idx "brown fox"
1) (integer) 1
2) "post_1"
3) 1) "content"
   2) "brown fox jumps over the fence."
127.0.0.1:6379> FT.SEARCH posts_idx "brown the fox"
1) (integer) 1
2) "post_1"
3) 1) "content"
   2) "brown fox jumps over the fence."
127.0.0.1:6379> FT.SEARCH posts_idx "brown the fox cannot jump"
1) (integer) 0
127.0.0.1:6379> FT.SEARCH posts_idx "br"
1) (integer) 0
127.0.0.1:6379> HSET post_1 content "green fox jumps over the fence."
(integer) 0
127.0.0.1:6379> FT.SEARCH posts_idx "Green fox"
1) (integer) 1
2) "post_1"
3) 1) "content"
   2) "green fox jumps over the fence."
127.0.0.1:6379> FT.SEARCH posts_idx "fox"
1) (integer) 1
2) "post_1"
3) 1) "content"
   2) "green fox jumps over the fence."
127.0.0.1:6379> HGETALL
(error) ERR wrong number of arguments for 'hgetall' command
127.0.0.1:6379> HGETALL posts
(empty list or set)
127.0.0.1:6379> HSET post_2 content "brown fox jumps over the fence."
(integer) 1
127.0.0.1:6379> FT.SEARCH posts_idx "fox"
1) (integer) 2
2) "post_2"
3) 1) "content"
   2) "brown fox jumps over the fence."
4) "post_1"
5) 1) "content"
   2) "green fox jumps over the fence."
127.0.0.1:6379> HSET post_3 content "brown cat jumps over the fence."
(integer) 1
127.0.0.1:6379> FT.SEARCH posts_idx "fox | brown"
1) (integer) 3
2) "post_2"
3) 1) "content"
   2) "brown fox jumps over the fence."
4) "post_3"
5) 1) "content"
   2) "brown cat jumps over the fence."
6) "post_1"
7) 1) "content"
   2) "green fox jumps over the fence."
127.0.0.1:6379> FT.SEARCH posts_idx "fox | brown"



## Connections
**??** Find existing connections of matching users and filter out ones that already have max number of connections.  
**SETTTL** Set a TTL on the new connection. The TTL can be refreshed with the same command if the two parties still have new activities.  

## Chat History
**??** Add a new message to the chat history between two users.  
**??** Sets the timestamp when the last time this user makes a move in the connection.  
**??** Retrieves the timestamp when the last time this user makes a move in the connection.

# Reference
[CSS style sheet](https://bbbootstrap.com/snippets/simple-chat-application-57631463)
