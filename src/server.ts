import http from "http";
import { Server } from "socket.io";
import app from "./app";
const jwt = require("jsonwebtoken");
const { Contacts, Messages } = require("./models/models");

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

  const token = socket.handshake.query.token;
  const serviceIdentifier = socket.handshake.query.serviceIdentifier;

  // JWT authentication
  const JWT_prefix = "JWT_SECRET_";
  const ISS_prefix = "TOKEN_ISS_";
  let JWT_SECRET;
  let decodedToken: TokenPayload;

  if (typeof serviceIdentifier === "string") {
    JWT_SECRET = process.env[JWT_prefix + serviceIdentifier];
  } else {
    console.error("Invalid serviceIdentifier");
  }

  interface TokenPayload {
    iss: string;
    sub: string | number;
  }

  try {
    decodedToken = jwt.verify(token, JWT_SECRET);
    if (decodedToken.iss !== process.env[ISS_prefix + serviceIdentifier]) {
      throw new Error("Invalid token issuer!");
    }
    userSocketMap.forEach((value, key) => {
      if (value === socket.id) {
        console.log("Duplicate mapping removed");
        userSocketMap.delete(key);
      }
    });
    userSocketMap.set(decodedToken.sub, socket.id);
  } catch (error) {
    console.error("Invalid JWT token! " + error);
    socket.disconnect(true);
    console.log("A user disconnected with id:", socket.id);
  }

  socket.on("contact_request", ({ senderId, recipientId }) => {
    Contacts.findOne({ sender_id: senderId, recipient_id: recipientId })
      .then(<T>(res: T) => {
        if (!res) {
          const newContact = new Contacts({
            sender_id: senderId,
            recipient_id: recipientId,
            accepted: false,
          });
          newContact
            .save()
            .then((doc: Document) => console.log("Contact saved:", doc))
            .catch((err: Error) => console.error("Error saving contact:", err));
        } else {
          throw new Error("Contact/request already exists");
        }
      })
      .catch((err: Error) => {
        console.error(err);
        return;
      });

    const recipientSocketId = userSocketMap.get(recipientId);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit(
        "receive_message",
        "Someone sent you new contact request!"
      );
    }
  });

  socket.on("accept_contact", ({ senderId, recipientId }) => {
    console.log(senderId, " ", recipientId);
    Contacts.findOneAndUpdate(
      { sender_id: senderId, recipient_id: recipientId },
      { accepted: true },
      {
        new: true,
      }
    )

      .then((updatedContact: Contact) => {
        console.log("Contact accepted:", updatedContact);
        // Optionally emit back to the client to confirm the acceptance
        socket.emit("contact_accepted", updatedContact);
      })
      .catch((err: Error) => {
        console.error("Error accepting contact:", err);
        // Handle errors, maybe send back an error message to the client
      });
  });
  socket.on("remove_contact", ({ senderId, recipientId }) => {
    Contacts.findOneAndDelete({
      $or: [
        { sender_id: senderId, recipient_id: recipientId },
        { sender_id: recipientId, recipient_id: senderId },
      ],
    })
      .then((deletedContact: any) => {
        if (deletedContact) {
          console.log("Contact removed:", deletedContact);
          // Optionally emit back to the client to confirm the deletion
          socket.emit("contact_removed", {
            status: "success",
            contactId: deletedContact._id,
          });
        } else {
          console.log("No contact found to remove.");
          socket.emit("contact_removed", { status: "not_found" });
        }
      })
      .catch((err: Error) => {
        console.error("Error removing contact:", err);
        // Handle errors, maybe send back an error message to the client
        socket.emit("contact_removed", {
          status: "error",
          message: err.message,
        });
      });
  });

  interface Contact {
    sender_id: string;
    recipient_id: string;
    accepted: boolean;
  }

  // Receiving a message and forwarding it
  socket.on("send_message", ({ senderId, recipientId, message }) => {
    Contacts.findOne({
      $or: [
        { sender_id: senderId, recipient_id: recipientId },
        { sender_id: recipientId, recipient_id: senderId },
      ],
      accepted: true,
    })
      .then((contact: Contact) => {
        if (contact && contact.accepted === true) {
          const newMessage = new Messages({
            sender_id: senderId,
            recipient_id: recipientId,
            message_content: message,
          });

          newMessage
            .save()
            .then((doc: any) => {
              const recipientSocketId = userSocketMap.get(recipientId);
              if (recipientSocketId) {
                io.to(recipientSocketId).emit("receive_message", {
                  senderId: senderId,
                  recipientId: recipientId,
                  message: message,
                });
              }

              // Emit confirmation back to sender
              socket.emit("message_confirmed", {
                _id: doc._id,
                senderId: senderId,
                recipientId: recipientId,
                message: message,
                timestamp: doc.timestamp,
              });
            })
            .catch((err: Error) => console.error("Error saving message:", err));
        } else {
          console.error("Contact request is not accepted!");
        }
      })
      .catch((err: Error) => {
        console.error(err);
      });
  });

  socket.on("fetch_contacts", (myUserId) => {
    Contacts.find({
      $or: [{ sender_id: myUserId }, { recipient_id: myUserId }],
    })
      .then((contacts: Contact) => socket.emit("contacts_data", contacts))
      .catch((err: Error) => socket.emit("error", err));
  });

  // Handling fetching messages
  socket.on("fetch_messages", ({ userId, recipientId }) => {
    Messages.find({
      $or: [
        { sender_id: userId, recipient_id: recipientId },
        { sender_id: recipientId, recipient_id: userId },
      ],
    })
      .sort({ timestamp: 1 })
      .then((messages: any) => {
        // Convert messages to the format expected by the frontend
        const formattedMessages = messages.map((msg: any) => ({
          senderId: msg.sender_id,
          recipientId: msg.recipient_id,
          message: msg.message_content,
        }));
        socket.emit("messages_data", formattedMessages);
      })
      .catch((err: Error) => socket.emit("error", err));
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

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
