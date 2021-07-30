// Setup basic express server
const express = require("express");
const app = express();
const path = require("path");
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
const port = process.env.PORT || 3000;
// const port = 3000;

server.listen(port, "0.0.0.0", () => {
  console.log("Server listening at port %d ", port);
});
// server.listen(port, "104.194.10.12", () => {
//   console.log("Server listening at port %d ", port);
// });

var options = {
  dotfiles: "ignore",
  etag: false,
  extensions: ["html", "js"],
  index: false,
  maxAge: "1d",
  redirect: false,
  setHeaders: function (res, path, stat) {
    res.set("x-timestamp", Date.now());
  },
};
app.use(express.static("public", options));
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/public/index.html");
});
// Routing
// app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

let sockets = {};

io.on("connection", (socket) => {
  let addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on("new message", (data) => {
    console.log("new message", data, sockets);
    // we tell the client to execute 'new message'
    if (sockets[data.to_id]) {
      io.to(sockets[data.to_id]).emit("new message", {
        acc_id: socket.username,
        to_id: data.to_id,
        message: data.msg,
        chat_id: data.chat_id,
        channel_id: data.channel_id,
        mode: data.mode,
      });
    }
  });
  socket.on('new channel', (data) => {
    console.log('new channel', data,sockets);
    if (Array.isArray(data.people)) {
      data.people.map(function(one) {
        io.to(sockets[one]).emit('new channel', data)
      })
    }
  });
  socket.on("send_mail", (data) => {
    console.log('send_mail', data, sockets);
    if (sockets[data.to_id]) {
      io.to(sockets[data.to_id]).emit("send_mail", {
        to_id: data.to_id,
        mail_id: data.mail_id,
        from: data.from,
        subject: data.subject,
      });
    }

  });

  // when the client emits 'add user', this listens and executes
  socket.on("add user", (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    sockets[username] = socket.id;
    addedUser = true;
    console.log("add user! and emit login", username, socket.id);
    socket.emit("login");
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on("typing", () => {
    socket.broadcast.emit("typing", {
      username: socket.username,
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on("stop typing", () => {
    socket.broadcast.emit("stop typing", {
      username: socket.username,
    });
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", () => {
    if (addedUser) {
      delete sockets[socket.username];
    }
  });
});
