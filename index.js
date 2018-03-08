var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

let users = [];
let deactivatedusers = [];
let messages = [];
let counter = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
      //Check if it is a command, handle if so
      let inputString = msg.split(";"); //Remove the user ID first
      let command = inputString[1].split(" "); //Split the input text by spaces
      if (command[0] === "/nick"){
          console.log("Found a nickname change request");
          let requestID = inputString[0];
          let newNick = command[1];
          if (newNick !== undefined) {
              let dupName = false;
              let myRecord = -1;
              for (i = 0; i < users.length; i++) {
                  if (String(users[i].unick) === newNick) {
                      dupName = true;
                      console.log("Duplicate username, abandoning request");
                      break;
                  }
                  if (String(users[i].uid) === requestID) {
                      //This is the user making request, save reference
                      myRecord = i;
                  }

              }
              //Have now searched entire username list or found duplicate
              if (!dupName) {
                  //Not a duplicate, update array and broadcast new list
                  users[myRecord].unick = newNick;
                  io.emit('new user', users);
              }
          }
      } else if (command[0] === "/nickcolor"){
         let newColor = command[1];
         if (newColor !== undefined) {
             let valid = true;
             if (newColor.length === 6) {
                 for (i = 0; i < 6; i++) {
                     if (newColor[i] < '0' || newColor[i] > 'f') {
                         valid = false;
                     }
                 }
                 if (valid) {
                     let colorString = "#" + newColor;
                     let userNum = -1;
                     for (i = 0; i < users.length; i++) {
                         if (String(users[i].uid) === inputString[0]) {
                             userNum = i;
                             break;
                         }
                     }
                     users[i].color = colorString;
                 } else {
                     console.log("Invalid color input");
                 }
             } else {
                 console.log("Invalid color input");
             }
         }
      } else {
          //Find the username for the user sending this message
          let temp = msg.split(";");
          let id = temp[0];
          let name = "";
          let color = "";
          for (i = 0; i < users.length; i++) {
              if (String(users[i].uid) === (String(id))) {
                  name = users[i].unick;
                  color = users[i].color;
                  break;
              }
          }


          var date = new Date();
          let h = date.getHours();
          let m = date.getMinutes();
          if (m < 10) {
              m = "0" + m;
          }
          let returned = {
              "hours": h,
              "mins": m,
              "nick": name,
              "message": temp[1],
              "uid": id,
              "color": color
          }
          io.emit('chat message', JSON.stringify(returned));
          messages.push(returned);
          if (messages.length > 200) {
              messages.splice(0, 1);
          }
      }
  });
  socket.on('disconnect', function(msg){
    //As soon as a disconnect is heard
    let dcid = socket.id;
    for (i = 0; i < users.length; i++){
        if (String(users[i].socketid) == String(dcid)){
            //remove user from array and rebroadcast
            console.log("Removing user name: " + users[i].unick);
            let temp = users.splice(i, 1);
            deactivatedusers.push(temp[0]);
        }
    }
    io.emit('new user', users);
  });
    socket.on('new user connect', function(mymsg){
        //Add to servers list of all users
        let nickname = "User#" + counter;
        counter++;
        //Generate a random initial color
        let colorDec = Math.floor(Math.random() * 16777215);
        let colorHex = colorDec.toString(16);

        let user = {
            "uid": mymsg,
            "unick": nickname,
            "socketid": socket.id,
            "color": "#" + colorHex
        }
        users.push(user);
        io.emit('new user', users);
        io.to(socket.id).emit('connected chat log', messages);
    });
  socket.on('user reconnect', function(oldid){
    //search for id in system, then inform users to add
      console.log("DEBUG: reconnected id = " + oldid);
      for (let i = 0; i < deactivatedusers.length; i++){
          if (String(deactivatedusers[i].uid) === String(oldid)){
              let reactivate = deactivatedusers[i];
              reactivate.socketid = socket.id;
              users.push(reactivate);
              console.log("new user is called:" + users.length);
              io.emit('new user', users);
              io.to(socket.id).emit('connected chat log', messages);
              break;
          }
      }

  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
