import { prisma } from '../config/prisma.js';
import { sanitizeHtml } from '../utils/sanitize.js';

export async function submitContactMessage({ name, email, subject, message, ipAddress }) {
  const cleanMessage = sanitizeHtml(message);
  return prisma.contactMessage.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject ? subject.trim() : null,
      message: cleanMessage,
      ipAddress,
    },
  });
}

export async function listContactMessages({ isRead = null, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {};
  if (isRead !== null) {
    where.isRead = isRead;
  }

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.contactMessage.count({ where }),
  ]);

  return {
    messages,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function markMessageRead(id, isRead = true) {
  return prisma.contactMessage.update({
    where: { id },
    data: { isRead },
  });
}

export async function deleteContactMessage(id) {
  return prisma.contactMessage.delete({ where: { id } });
}
