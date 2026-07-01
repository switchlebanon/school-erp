// backend/routes/messages.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');
const requireAuth  = authenticate;
const requireAdmin = (req, res, next) => authenticate(req, res, () => authorize('ADMIN')(req, res, next));
const requireTeacher = (req, res, next) => authenticate(req, res, () => authorize('TEACHER', 'ADMIN')(req, res, next));

// GET /api/messages/inbox — current user's inbox
router.get('/inbox', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const items = await prisma.messageRecipient.findMany({
      where: { recipientId: userId, isDeleted: false, folder: 'INBOX' },
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
      },
      orderBy: { message: { createdAt: 'desc' } },
    });

    const inbox = items.map((item) => ({
      recipientId: item.id,
      messageId: item.messageId,
      isRead: item.isRead,
      readAt: item.readAt,
      subject: item.message.subject,
      body: item.message.body,
      sender: item.message.sender,
      createdAt: item.message.createdAt,
    }));

    res.json(inbox);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/sent — messages sent by current user
router.get('/sent', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const messages = await prisma.message.findMany({
      where: { senderId: userId },
      include: {
        recipients: {
          where: { isDeleted: false },
          include: {
            recipient: { select: { id: true, name: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:id — read one message (marks as read)
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipients: {
          include: { recipient: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    if (!message) return res.status(404).json({ error: 'Message not found.' });

    // Check user is sender or recipient
    const isSender = message.senderId === userId;
    const recipRecord = message.recipients.find((r) => r.recipientId === userId);
    if (!isSender && !recipRecord) return res.status(403).json({ error: 'Access denied.' });

    // Mark as read if recipient
    if (recipRecord && !recipRecord.isRead) {
      await prisma.messageRecipient.update({
        where: { id: recipRecord.id },
        data: { isRead: true, readAt: new Date() },
      });
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages — send a message
router.post('/', requireAuth, async (req, res) => {
  const { recipientIds, subject, body } = req.body;
  const senderId = req.user.id;

  if (!recipientIds?.length || !subject?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'recipientIds, subject, and body are required.' });
  }

  try {
    // Verify all recipients exist
    const users = await prisma.user.findMany({ where: { id: { in: recipientIds } } });
    if (users.length !== recipientIds.length) {
      return res.status(400).json({ error: 'One or more recipients not found.' });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        subject: subject.trim(),
        body: body.trim(),
        recipients: {
          create: recipientIds.map((rid) => ({
            recipientId: rid,
            folder: 'INBOX',
          })),
        },
      },
      include: {
        recipients: { include: { recipient: { select: { id: true, name: true } } } },
      },
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/messages/:recipientId/read — mark as read
router.patch('/:recipientId/read', requireAuth, async (req, res) => {
  const { recipientId } = req.params;
  const userId = req.user.id;
  try {
    const record = await prisma.messageRecipient.findUnique({ where: { id: recipientId } });
    if (!record || record.recipientId !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const updated = await prisma.messageRecipient.update({
      where: { id: recipientId },
      data: { isRead: true, readAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages/:recipientId — soft delete from inbox
router.delete('/:recipientId', requireAuth, async (req, res) => {
  const { recipientId } = req.params;
  const userId = req.user.id;
  try {
    const record = await prisma.messageRecipient.findUnique({ where: { id: recipientId } });
    if (!record || record.recipientId !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    await prisma.messageRecipient.update({ where: { id: recipientId }, data: { isDeleted: true } });
    res.json({ message: 'Deleted from inbox.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/unread-count — badge count
router.get('/unread-count', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const count = await prisma.messageRecipient.count({
      where: { recipientId: userId, isRead: false, isDeleted: false, folder: 'INBOX' },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/contacts — list users you can message (teachers + parents)
router.get('/contacts', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { role } = req.query;
  try {
    const where = { id: { not: userId } };
    if (role) where.role = role;
    else where.role = { in: ['TEACHER', 'PARENT', 'ADMIN'] };

    const contacts = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
