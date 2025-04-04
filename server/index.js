import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // Add configuration for handling larger number of connections
  maxHttpBufferSize: 1e8, // 100 MB
  pingTimeout: 60000,     // 60 seconds
  pingInterval: 25000     // 25 seconds
});

const PORT = process.env.PORT || 3001;

// Keep track of users in each room
const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join_room", (roomID, username) => {
    console.log(`User ${socket.id} joined room ${roomID} as ${username}`);
    
    // Leave previous rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
        
        // Remove from room tracking
        if (rooms.has(room)) {
          const users = rooms.get(room);
          const index = users.findIndex(user => user.id === socket.id);
          if (index !== -1) {
            users.splice(index, 1);
            if (users.length === 0) {
              rooms.delete(room);
            }
          }
        }
      }
    });

    // Join new room
    socket.join(roomID);
    
    // Create new user entry
    const userInfo = {
      id: socket.id,
      username
    };
    
    // Add to room tracking
    if (!rooms.has(roomID)) {
      rooms.set(roomID, []);
    }
    rooms.get(roomID).push(userInfo);
    
    // Get all users in this room
    const usersInRoom = rooms.get(roomID);
    
    // Emit to the joined user about all existing users
    socket.emit("room_users", usersInRoom);
    
    // Let other participants know about the new user
    socket.to(roomID).emit("user_joined", userInfo);

    // Handle WebRTC signaling
    socket.on("offer", (offer, toUserID) => {
      socket.to(toUserID).emit("offer", offer, socket.id);
    });

    socket.on("answer", (answer, toUserID) => {
      socket.to(toUserID).emit("answer", answer, socket.id);
    });

    socket.on("ice_candidate", (candidate, toUserID) => {
      socket.to(toUserID).emit("ice_candidate", candidate, socket.id);
    });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    socket.rooms.forEach(room => {
      if (room !== socket.id && rooms.has(room)) {
        const users = rooms.get(room);
        const index = users.findIndex(user => user.id === socket.id);
        if (index !== -1) {
          users.splice(index, 1);
          if (users.length === 0) {
            rooms.delete(room);
          } else {
            // Notify remaining users
            io.to(room).emit("user_left", socket.id);
          }
        }
      }
    });
  });
});

// Add a basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
