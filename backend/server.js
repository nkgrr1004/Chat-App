const express = require('express');
const dotenv = require('dotenv');
const { chats } = require('./data/data');
const connectDB = require('./config/db');
const colors = require('colors');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const {notFound, errorHandler} = require('./middleware/errorMiddleware');
const path = require('path');


dotenv.config();

connectDB();
const app = express();

app.use(express.json()) // to accept json data

app.get('/', (req, res) => {
res.send('API is running Successfully');
});

// app.get('/api/chat', (req, res) => {
//     res.send(chats)
// });

// app.get('/api/chat/:id', (req, res) => {
//     //console.log(req.params.id);

//     const singleChat = chats.find((c) => c._id === req.params.id);
//     res.send(singleChat);
// });

app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);

//-----------------------Deployment-----------------------

const ___dirname1 = path.resolve();
if(process.env.NODE_ENV === 'production'){
    app.use(express.static(path.join(___dirname1, 'frontend/build')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(___dirname1, 'frontend', 'build', 'index.html'));
    });
} else {
    app.use('/', (req, res) => {
        res.send("API is running Successfully");
    })
}


//----------------------Deployment--------------------

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5500;
const server = app.listen(5500, console.log(`Server is running on PORT ${5500}`.yellow.bold));

const io = require('socket.io')(server, {
    pingTimeout: 60000,
    cors: {
        origin: 'http://localhost:3000',
    },
});

io.on("connection", (socket) => {
    console.log("connected to socket.io");  
    
    socket.on('setup', (userData) => {
       socket.join(userData._id);
       socket.emit("connected")
    });

    socket.on("join chat", (room) => {
        socket.join(room);
       console.log("user joined room " + room);
    });


    socket.on('typing', (room) => socket.in(room).emit("typing"));
    socket.on('stop typing', (room) => socket.in(room).emit("stop typing"));

    socket.on('new message', (newMessageReceived) => {
        var chat = newMessageReceived.chat;
        if(!chat.users) return console.log('chat.users not defined');

        chat.users.forEach(user => {
            if(user.id === newMessageReceived.sender._id) return;
            socket.in(user.id).emit('message received', newMessageReceived);
        });
    });

    socket.off('setup', () => {
        console.log('USER DISCONNECTED');
        socket.leave(userData._id);
    });
});