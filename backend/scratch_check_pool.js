const { io } = require('socket.io-client');
const socket = io('http://localhost:5000');
socket.on('connect', () => {
    console.log("Connected");
    socket.emit('admin_get_pool_status'); // if such an event exists?
    setTimeout(() => { process.exit(); }, 1000);
});
