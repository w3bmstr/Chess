(function (global) {
    // Set this to your deployed Node/Socket.IO backend URL before publishing multiplayer.
    // Example: global.CHESS2_SOCKET_SERVER_URL = 'https://your-backend.example.com';
    global.CHESS2_SOCKET_SERVER_URL = global.CHESS2_SOCKET_SERVER_URL || '';

    // Public site URL used for shareable private-game links on GitHub Pages.
    global.CHESS2_PUBLIC_BASE_URL = global.CHESS2_PUBLIC_BASE_URL || 'https://w3bmstr.github.io/Chess';

    // Local vendored Socket.IO client script used for offline-capable boot.
    global.CHESS2_SOCKET_CLIENT_SCRIPT_URL = global.CHESS2_SOCKET_CLIENT_SCRIPT_URL || 'vendor/socket.io/socket.io.min.js';
})(window);
