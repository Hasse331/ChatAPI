import mongoose from "mongoose";
const Schema = mongoose.Schema;

const messagesSchema = new Schema({
  sender_id: {
    type: String, // Assuming UUIDs are stored as strings
    required: true,
    index: true,
  },
  recipient_id: {
    type: String, // Same as above
    required: true,
    index: true,
  },
  message_content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const contactsSchema = new Schema({
  sender_id: {
    type: String, // Assuming UUIDs are stored as strings
    required: true,
    index: true,
  },
  recipient_id: {
    type: String, // Same as above
    required: true,
    index: true,
  },
  accepted: {
    type: Boolean,
    default: false,
  },
});

const Contacts = mongoose.model("Contacts", contactsSchema);
const Messages = mongoose.model("Messages", messagesSchema);

module.exports = {
  Contacts,
  Messages,
};
