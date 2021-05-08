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
# To start the Redis server
docker-compose up -d
# To start the chat client
node index.js
# To start the chat client if you have nodemon installed and make changes instantly available
nodemon
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

## Connections
**??** Find existing connections of matching users and filter out ones that already have max number of connections.  
**SETTTL** Set a TTL on the new connection. The TTL can be refreshed with the same command if the two parties still have new activities.  

## Chat History
**??** Add a new message to the chat history between two users.  
**??** Sets the timestamp when the last time this user makes a move in the connection.  
**??** Retrieves the timestamp when the last time this user makes a move in the connection.

