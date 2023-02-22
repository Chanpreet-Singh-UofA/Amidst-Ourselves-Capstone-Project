const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
// var hark = require('hark')

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origins: ["http://127.0.0.1:5500"],
        methods: ["GET", "POST"]
    }
});

httpServer.listen(3000, () => {
    console.log('listening on localhost:3000');
});




const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_CHARACTERS = "abcdefghijklmnopqrstuvwxyz";
const ROOM_CODE_CHARACTERS_LENGTH = ROOM_CODE_CHARACTERS.length;

let rooms = {};
let sockets = {}



io.on('connection', (socket) => {
    socket.on('roomJoinCreate', (roomCodeObj) => {
        let roomObj;
        if (roomCodeObj.roomCode === undefined) {
            roomObj = createRoom();
        } else {
            roomObj = getRoom(roomCodeObj.roomCode);
        }
        socket.emit('roomJoinCreateResponse', roomObj);
    });

    socket.on('roomJoin', (roomCodeObj) => {
        if (roomCodeObj.roomCode === undefined || !roomCodeObj.roomCode in rooms) {
            socket.emit('roomJoinResponse', {});
            return;
        }

        let room = rooms[roomCodeObj.roomCode];

        if (room.players === undefined) {
            players = {};
            players[socket.id] = {x: 400, y: 400};
            room["host"] = socket.id;
            room["players"] = players;
        } else {
            room.players[socket.id] = {x: 400, y: 400};
        }

        io.to(roomCodeObj.roomCode).emit('join', {id: socket.id, x: 400, y: 400});
        socket.join(roomCodeObj.roomCode);
        socket.emit('roomJoinResponse', rooms[roomCodeObj.roomCode]);
        socket.roomCode = roomCodeObj.roomCode;

        console.log(rooms);
    });

    socket.on('disconnect', () => {
        if (socket.roomCode === undefined) {
            // do nothing
        } else {
            delete rooms[socket.roomCode].players[socket.id];
            io.to(socket.roomCode).emit('leave', {id: socket.id});
        }
    });

    socket.on('move', (playerObj) => {
        socket.broadcast.to(socket.roomCode).emit('move', {
            id: socket.id,
            x: playerObj.x,
            y: playerObj.y
        });
        // console.log("why I neever trigger");
        socket.broadcast.to(socket.roomCode).emit('my_pos2', {
            id: socket.id,
            x: playerObj.x,
            y: playerObj.y
        });
        socket.emit('my_pos2', {
            id: socket.id,
            x: playerObj.x,
            y: playerObj.y
        });
        rooms[socket.roomCode].players[socket.id].x = playerObj.x;
        rooms[socket.roomCode].players[socket.id].y = playerObj.y;
    });

    /* Below are webRTC events
    **************************
    **************************
    **************************
    **************************
    */
    sockets[socket.id] = socket;
    // this event should be called before the above disconnect function
    socket.on('webRTC_disconnect', () => {
        for (let channel in socket.channels) {
            webRTC_delete(channel);
        }
    });

    socket.on('webRTC_speaking', (config) => {
        // console.log("received" + config.bool);
        socket.broadcast.to(socket.roomCode).emit('webRTC_speaking', config);
    });

    socket.on('webRTC_join', (roomCodeObj) => {
        console.log("received webRTC_join request");
        let roomCode = roomCodeObj.roomCode;

        // if (roomCode in rooms) {
        //     // if already joined
        //     return;
        // }

        for (let player in rooms[roomCode].players) {
            // iterate through the players list and create p2p connection for each pair
            // pairs are stored in channel array

            sockets[player].emit('addPeer', {'peer_id': socket.id, 'should_create_offer': false});
            console.log("I'm creating p2p2")
            socket.emit('addPeer', {'peer_id': player, 'should_create_offer': true});
        
        }
    });

    function webRTC_delete(channel) {
        // if channel not exist in the socket channels list then no need to delete it 
        if (!(channel in socket.channels)) {
            return;
        }

        delete socket.channels[channel];
        // notify all users the room has been deleted
        for (let player in rooms[roomCode].players) {
            player.emit('removePeer', {'peer_id': socket.id});
            socket.emit('removePeer', {'peer_id': id});
        }
    }

    socket.on('webRTC_delete', webRTC_delete);

    socket.on('relayICECandidate', (config) => {
        let peer_id = config.peer_id;
        let ice_candidate = config.ice_candidate;
        let roomCode = config.roomCode;

        if (peer_id in rooms[roomCode].players) {
            sockets[peer_id].emit('iceCandidate', {'peer_id': socket.id, 'ice_candidate': ice_candidate});
        }
    });
    
    // listen to client session description
    socket.on('relaySessionDescription', (config) => {
        let peer_id = config.peer_id;
        let session_description = config.session_description;
        let roomCode = config.roomCode;

        if (peer_id in rooms[roomCode].players) {
            sockets[peer_id].emit('sessionDescription', {'peer_id': socket.id, 'session_description': session_description});
        }
    });
   /* End of webRTC events
    **************************
    **************************
    **************************
    **************************
    */

});


function createRoom() {
    let roomCode = createRoomCode();
    let newRoom = {
        roomCode: roomCode,
        speed: 2
    }
    rooms[roomCode] = newRoom;
    return rooms[roomCode];
}


function getRoom(roomCode) {
    if (roomCode in rooms) {
        return rooms[roomCode];
    }
    return {};
}


function createRoomCode() {
    let roomCode;
    do {
        roomCode = '';
        for (let i=0; i<ROOM_CODE_LENGTH; i++) {
            roomCode += ROOM_CODE_CHARACTERS[Math.floor(Math.random() * ROOM_CODE_CHARACTERS_LENGTH)];
        }
    } while (roomCode in rooms);
    return roomCode;
}
