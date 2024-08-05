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
});

const User = mongoose.model('User', userSchema);

module.exports = { User };