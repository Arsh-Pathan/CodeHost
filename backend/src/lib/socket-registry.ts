import type { Server } from 'socket.io';

let socketServer: Server | null = null;

export function setSocketServer(io: Server) {
  socketServer = io;
}

/**
 * Disconnect all active WebSocket connections belonging to a user
 * (used upon password reset/change, admin role demotion, or user deletion).
 */
export function disconnectUserSockets(userId: string) {
  if (!socketServer || !userId) return;
  for (const [, socket] of socketServer.sockets.sockets) {
    if (socket.data?.userId === userId) {
      socket.disconnect(true);
    }
  }
}
