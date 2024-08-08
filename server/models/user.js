const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    strategy: {
        type: String,
        enum: ["local", "google"],
        required: true,
    },
    googleId: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
        required: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    status: {
        type: String,
        default: "offline"

    }
});


const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        content: String,
        editedAt: Date
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    deliveryStatus: {
        type: String,
       
        default: 'sent'
    },
    readTimestamp: {
        type: Date
    }
});

// Indexes for efficient querying
messageSchema.index({ senderId: 1, recipientId: 1, timestamp: -1 });
messageSchema.index({ recipientId: 1, timestamp: -1 });

// Method to mark a message as read
messageSchema.methods.markAsRead = function () {
    this.deliveryStatus = 'read';
    this.readTimestamp = new Date();
    return this.save();
};

// Static method to mark multiple messages as read
messageSchema.statics.markManyAsRead = function (recipientId, senderIds) {
    return this.updateMany(
        {
            recipientId: recipientId,
            senderId: { $in: senderIds },
            deliveryStatus: { $ne: 'read' }
        },
        {
            $set: {
                deliveryStatus: 'read',
                readTimestamp: new Date()
            }
        }
    );
};

// Static method to get unread messages count
messageSchema.statics.getUnreadCount = function (userId) {
    return this.countDocuments({
        recipientId: userId,
        deliveryStatus: { $ne: 'read' }
    });
};

const Message = mongoose.model('Message', messageSchema);

const User = mongoose.model('User', userSchema);

module.exports = { User,Message };