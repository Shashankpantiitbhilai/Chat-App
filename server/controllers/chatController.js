const { User, Message } = require('../models/user'); // Adjust the path as necessary
const { io } = require("../server")
// Function to add a member
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});

        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error: error.message });
    }
};
exports.addMember = async (req, res) => {
    try {
        const { memberId } = req.body; // The ID of the new member to add
        const { id } = req.user; // The ID of the current user

        // Find the user by their ID
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Add the new member's ID to the members array
        user.members.push(memberId);

        // Save the updated user document
        await user.save();

        res.status(200).json({ message: "Member added successfully", user });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error: error.message });
    }
};

// Function to get members' details
exports.getMembers = async (req, res) => {
    try {
        const { id } = req.user; // The ID of the current user

        // Find the user by their ID and populate the members' details
        const user = await User.findById(id).populate('members');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ members: user.members });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error: error.message });
    }
};
exports.getConversation = async (req, res) => {
    try {
        const { recipientId } = req.params;
        const senderId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        // Define the query to find the messages in the conversation
        const query = {
            $or: [
                { senderId, recipientId },
                { senderId: recipientId, recipientId: senderId }
            ]
        };

        // Define the update query to set deliverystatus to 'read'
        const updateQuery = {
            recipientId: senderId,
            senderId: recipientId
        };

    

        // Update the deliverystatus field to 'read' for messages where recipientId is the current user
        const updateResult = await Message.updateMany(updateQuery, { $set: { deliveryStatus: 'read' } });
       
        if (!updateResult.acknowledged) {
            throw new Error('Failed to update message status');
        }

        // Retrieve the messages with pagination
        const messages = await Message.find(query)
            .sort({ timestamp: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('senderId', 'name online')
            .populate('recipientId', 'name online');

        res.json(messages);
    } catch (error) {
        console.error('Error in getConversation:', error);
        res.status(500).json({ message: 'Server error' });
    }
};



// Function to send a message
exports.sendMessage = async (req, res) => {
    try {
        const { recipientId, content } = req.body;
        const senderId = req.user._id;

        const newMessage = new Message({
            senderId,
            recipientId,
            content,
            deliveryStatus: 'sent'
        });

        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId')
            .populate('recipientId');

        // Emit socket event using req.io
        // req.io.to(recipientId).emit('new_message', populatedMessage);

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error in sendMessage:', error);
        res.status(500).json({ message: 'Server error' });
    }
};



exports.editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const senderId = req.user._id;

        const updatedMessage = await Message.findOneAndUpdate(
            { _id: messageId, senderId },
            { content, edited: true },
            { new: true }
        ).populate('senderId', 'name online')
            .populate('recipientId', 'name online');

        if (!updatedMessage) {
            return res.status(404).json({ message: 'Message not found or you\'re not authorized to edit it' });
        }

        // Emit socket event (to be implemented in server.js)
        req.app.get('io').to(updatedMessage.recipientId).emit('message_edited', updatedMessage);

        res.json(updatedMessage);
    } catch (error) {
        console.error('Error in editMessage:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteMessage = async (req, res) => {
  
    try {
        const { messageId } = req.params;
        const senderId = req.user._id;

        const deletedMessage = await Message.findOneAndDelete({ _id: messageId });
    
        if (!deletedMessage) {
            return res.status(404).json({ message: 'Message not found or you\'re not authorized to delete it' });
        }

        // Emit socket event (to be implemented in server.js)


        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error in deleteMessage:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.markAsDelivered = async (req, res) => {
    try {
        const { messageId } = req.params;
        const recipientId = req.user._id;

        const message = await Message.findOneAndUpdate(
            { _id: messageId, recipientId, deliveryStatus: 'sent' },
            { deliveryStatus: 'delivered' },
            { new: true }
        ).populate('senderId', 'name online')
            .populate('recipientId', 'name online');

        if (!message) {
            return res.status(404).json({ message: 'Message not found or already delivered' });
        }

        // Emit socket event (to be implemented in server.js)
        req.app.get('io').to(message.senderId).emit('message_delivered', message);

        res.json(message);
    } catch (error) {
        console.error('Error in markAsDelivered:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { messageId } = req.params;
        const recipientId = req.user._id;

        const message = await Message.findOneAndUpdate(
            { _id: messageId, recipientId, deliveryStatus: { $ne: 'read' } },
            { deliveryStatus: 'read' },
            { new: true }
        ).populate('senderId', 'name online')
            .populate('recipientId', 'name online');

        if (!message) {
            return res.status(404).json({ message: 'Message not found or already read' });
        }

        // Emit socket event (to be implemented in server.js)
        req.app.get('io').to(message.senderId).emit('message_read', message);

        res.json(message);
    } catch (error) {
        console.error('Error in markAsRead:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getOnlineStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId, 'online');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ online: user.online });
    } catch (error) {
        console.error('Error in getOnlineStatus:', error);
        res.status(500).json({ message: 'Server error' });
    }
};