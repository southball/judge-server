import { AppState } from '../app-state';

export async function initSocketIO(): Promise<void> {
  const { io } = AppState.get();

  io.on('connection', (socket) => {
    let authenticated = false;

    // Ban user
    for (const nsp of Object.values(io.nsps)) {
      delete nsp.connected[socket.id];
    }

    socket.on('authenticate', (token) => {
      // TODO check authentication
      console.log('token authentication', token);
      authenticated = true;

      socket.emit('authenticated');

      // Unban user
      for (const nsp of Object.values(io.nsps)) {
        if (typeof nsp.sockets[socket.id] !== 'undefined') {
          nsp.connected[socket.id] = socket;
        }
      }
    });

    setTimeout(() => {
      if (!authenticated && !socket.disconnected) {
        socket.emit('unauthenticated', 'Authentication timed out.');
        socket.disconnect();
      }
    }, 30000);
  });
}
