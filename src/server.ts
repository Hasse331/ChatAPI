import http from "http";
import { Server } from "socket.io";
import app from "./app";
const userSocketMap = new Map();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow your frontend's origin
    methods: ["GET", "POST"], // Allowable methods
  },
});

io.on("connection", (socket) => {
  console.log("A user connected with id:", socket.id);

  socket.on("register_user", (userId) => {
    userSocketMap.set(userId, socket.id);
  });

  // Receiving a message and forwarding it
  socket.on("send_message", ({ recipientId, message }) => {
    // Here, implement the logic to identify the recipient's socket
    // For example, if you maintain a mapping of userIds to socketIds
    const recipientSocketId = userSocketMap.get(recipientId);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive_message", message);
    }
  });

  socket.on("disconnect", () => {
    // Remove the user from the map on disconnect
    userSocketMap.forEach((value, key) => {
      if (value === socket.id) {
        userSocketMap.delete(key);
      }
    });
    console.log("A user disconnected", socket.id);
  });
});

function findRecipientSocketId(recipientId: any) {
  // Implement logic to find the recipient's socket ID
  // This might involve looking up a user/socket mapping stored in memory or database
  // For now, let's return a placeholder
  return "EqIrweg6dtB73a4qAAAB"; // Replace with actual logic
}

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
