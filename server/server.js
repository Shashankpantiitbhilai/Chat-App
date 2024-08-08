const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const { passport } = require('./passportConfig');
require('dotenv').config();
const { User } = require('./models/user');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const jwt = require('jsonwebtoken');
const app = express();
const server = http.createServer(app);

const origin = process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_PROD
    : process.env.FRONTEND_DEV;

const io = socketIO(server, {
    cors: {
        origin,
        methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
});

console.log(`Running in ${process.env.NODE_ENV} mode`);
app.set('trust proxy', 1);

app.use(cors({
    origin,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
});

app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

const wrap = middleware => (socket, next) => middleware(socket.request, socket.request.res || {}, next);

io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

mongoose.connect(process.env.MONGODB_URI, {})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

const updateUserStatus = async (userId, status) => {
    await User.findByIdAndUpdate(userId, { status });
};

const socketToUser = new Map();

function getUserIdFromSocket(socket) {
    return socketToUser.get(socket.id);
}

io.use(async (socket, next) => {
    console.log("Socket authentication middleware");
    if (socket.request.user) {
        socket.user = socket.request.user;
        return next();
    }

    const token = socket.handshake.auth.token;
    console.log(`Token received: ${token}`);
    if (token) {
        try {
            // Verify token using jwt.verify
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            console.log(user);
            if (user) {
                socket.user = user;
                return next();
            }
        } catch (error) {
            console.error('Token authentication error:', error);
        }
    }

    next(new Error('Authentication failed'));
});

io.on('connection', (socket) => {
    console.log('New WebSocket connection');

    if (socket.user) {
        console.log('Authenticated user connected:', socket.user.email);

        socket.on('user_connected', async () => {
            const userId = socket.user._id;
            // Update user status to online
            socketToUser.set(socket.id, userId);
            await updateUserStatus(userId, 'online');
            socket.broadcast.emit('user_status_change', { userId, status: 'online' });
        });

        socket.on('join_room', (roomId) => {
            console.log(`User ${socket.user.email} joined room ${roomId}`);
            socket.join(roomId);
        });

        socket.on('leave_room', (roomId) => {
            console.log(`User ${socket.user.email} left room ${roomId}`);
            socket.leave(roomId);
        });

        socket.on('typing', ({ recipientId, isTyping }) => {
            socket.to(recipientId).emit('user_typing', { userId: socket.user._id, isTyping });
        });

        socket.on('send_message', (message, sender, receiver) => {
            
            io.emit('newMessage', { ...message, sender: socket.user._id });
        });

        socket.on('edit_message', (message) => {
            io.emit('message_edited', message);
        });

        socket.on('delete_message', (messageId) => {
            io.emit('message_deleted', messageId);
        });

        socket.on('mark_delivered', (message) => {
            io.emit('message_delivered', message);
        });

        socket.on('mark_read', (message) => {
            io.emit('message_read', message);
        });

        socket.on('disconnect', async () => {
            const userId = socket.user._id;
            await updateUserStatus(userId, 'offline');
            socket.broadcast.emit('user_status_change', { userId, status: 'offline' });
            socketToUser.delete(socket.id);
        });
    } else {
        console.log('Unauthenticated connection');
        socket.disconnect(true);
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { io };