const express = require("express");
var http =require("http");

const app = express();
const port = process.env.PORT ||3000;
const Room  = require("./models/room");
var server= http.createServer(app);

const mongoose = require("mongoose");
const { Socket } = require("net");
const getWord = require("./api/getwords");
var io= require("socket.io")(server);

app.use(express.json());

//connect daatabase

const db="mongodb+srv://sangram:sangram31@cluster1.a2bgpd2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1";
mongoose.connect(db).then(()=>{
    console.log("connection scuccessfull");
}).catch((e)=>{
    console.log(e);
})
io.on('connection',(socket)=>{
    console.log("connected");
    
    socket.on('create-game',async({nickname,name,occupancy,maxRounds})=>{
        try{
            console.log(name);
const exsitingroom = await Room.findOne({name});
if(exsitingroom){
    console.log("here not gone");
    socket.emit('notcorrectgame','Room with name already eixsts');
    return;
}
let room = new Room();
const word=getWord();
console.log(word);
room.word=word;
room.name=name;
room.occupancy=occupancy;
room.maxRounds=maxRounds;
console.log(socket.id);
let  player={
    socketID:socket.id,
    nickname,
    isPartyLeader:true,
}
room.players.push(player);
room = await room.save();
socket.join(name);
io.to(name).emit("updateroom",room);


        }catch(e){

        }

    });

    socket.on('join-game',async({nickname,name})=>{
        try{
            console.log("hre ");
            let room = await Room.findOne({name});
            if(!room){
                socket.emit('notcorrectgame','please neter a valid room name');

            }
            if(room.isJoin){
                console.log("here here");
                let player={
                    socketID:socket.id,
                    nickname,
                }
                room.players.push(player);
                socket.join(name);

                if(room.players.length===room.occupancy){
                    room.isJoin=false;
                }
                room.turn= room.players[room.turnIndex];
                room =await room.save();
                io.to(name).emit("updateroom",room);
            }else{
                socket.emit('notcorrectgame','Game started');
            }
        }catch(e){

        }
    })

    socket.on('paint',({details,roomName})=>{

        console.log(details);
        io.to(roomName).emit('points',{details:details});
    })
    
  socket.on("clean-screen", (roomId) => {
    console.log("herer the");
    io.to(roomId).emit("clear-screen", "");
  });
  socket.on("change-turn",async(name)=>{
    try{
let room = await Room.findOne({name});
let idx= room.turnIndex;
if(idx+1==room.players.length){
    room.currentRound+=1;
}
if(room.currentRound<=room.maxRounds){
    const word=getword();
    room.word=word;
    room.turnIndex=(idx+1)%room.players.length;
    room.turn=room.players[room.turnIndex];
    room =await room.save();
    io.to(name).emit('change-turn',room);
}else{
    //
}
    }catch(e){

    }
  })
        socket.on('stroke-width',({value,roomName})=>{

            io.to(roomName).emit('stroke-width',value);
        })
    socket.on('color-change',({color,roomName})=>{
        console.log(color);
        io.to(roomName).emit('color-change',color);

    })
    socket.on('msg',async(data)=>{

        console.log("here is opwer");
        try{
            if (data.msg === data.word) {
                // increment points algorithm = totaltime/timetaken *10 = 30/20
                let room = await Room.find({ name: data.roomName });
                let userPlayer = room[0].players.filter(
                  (player) => player.nickname === data.username
                );
                if (data.timeTaken !== 0) {
                  userPlayer[0].points += Math.round((200 / data.timeTaken) * 10);
                }
                room = await room[0].save();
                io.to(data.roomName).emit("msg", {
                  username: data.username,
                  msg: "guessed it!",
                  guessedUserCtr: data.guessedUserCtr + 1,
                });
                socket.emit("closeInput", "");}
            io.to(data.roomName).emit('msg',{
                username:data.username,
                msg:data.msg,
                guessedUserCtr:data.guessedUserCtr

            })
        }catch(e){
            console.log(e);
        }


    })
})

server.listen(port,"0.0.0.0",()=>{
    console.log("server started on prot 3000");
})

