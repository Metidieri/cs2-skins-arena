const prisma = require('../config/db');

async function createNotification(userId, type, title, message, data, io) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
    },
  });

  if (io) {
    io.to(`user-${userId}`).emit('notification:new', {
      ...notification,
      data: data || null,
    });
  }

  return notification;
}

module.exports = { createNotification };
