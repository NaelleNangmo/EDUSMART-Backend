'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const messagesService = require('./messages.service');

// GET /api/messages/unread-count
router.get('/unread-count', verifyToken, async (req, res, next) => {
  try {
    const count = await messagesService.getUnreadCount(req.user.id);
    return res.json({ success: true, count });
  } catch (err) {
    return next(err);
  }
});

// GET /api/messages/inbox
router.get('/inbox', verifyToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await messagesService.getInbox(req.user.id, page, limit);
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// GET /api/messages/sent
router.get('/sent', verifyToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await messagesService.getSent(req.user.id, page, limit);
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// GET /api/messages/:id
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const message = await messagesService.getMessageById(parseInt(req.params.id, 10), req.user.id);
    return res.json({ success: true, message });
  } catch (err) {
    return next(err);
  }
});

// POST /api/messages
router.post(
  '/',
  verifyToken,
  [
    body('destinataire_id').isInt({ min: 1 }).withMessage('Destinataire requis'),
    body('objet').isLength({ min: 1, max: 300 }).withMessage('Objet requis (max 300 caractères)'),
    body('corps').isLength({ min: 1 }).withMessage('Corps du message requis'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const message = await messagesService.sendMessage(req.body, req.user.id);
      return res.status(201).json({ success: true, message });
    } catch (err) {
      return next(err);
    }
  }
);

// DELETE /api/messages/:id
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await messagesService.deleteMessage(parseInt(req.params.id, 10), req.user.id);
    return res.json({ success: true, message: 'Message supprimé' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
