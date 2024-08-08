const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
 // Assuming you have a middleware

// Get conversation history
router.get('/messages/:recipientId', chatController.getConversation);
router.post('/addMember', chatController.addMember);
router.get('/getMembers', chatController.getMembers);
router.get('/getAllUsers', chatController.getAllUsers);
// Send a new message
router.post('/messages', chatController.sendMessage);

// Edit a message
router.put('/messages/:messageId', chatController.editMessage);

// Delete a message
router.delete('/messages/:messageId', chatController.deleteMessage);

// Mark message as delivered
router.put('/messages/:messageId/deliver', chatController.markAsDelivered);

// Mark message as read
router.put('/messages/:messageId/read', chatController.markAsRead);

// Get online status of a user
router.get('/users/:userId/status', chatController.getOnlineStatus);

module.exports = router;