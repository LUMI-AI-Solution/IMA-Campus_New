const io = require('socket.io-client');
const socket = io('http://localhost:5000');
socket.on('connect', () => {
    socket.emit('admin_test_socket', { msg: 'hello' }); // See if we can get a response?
    setTimeout(() => { process.exit(); }, 1000);
});
