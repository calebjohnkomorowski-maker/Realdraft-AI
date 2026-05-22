const express = require('express');
const router = express.Router();
const { processIntakeMessage } = require('../services/claude');

// In-memory session store (replace with Redis or Supabase for production)
const sessions = new Map();

router.post('/intake', async (req, res, next) => {
  try {
    const { sessionId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const history = sessions.get(sessionId) || [];
    history.push({ role: 'user', content: message });

    const result = await processIntakeMessage(history);

    history.push({ role: 'assistant', content: result.message });
    sessions.set(sessionId, history);

    res.json({
      message: result.message,
      isComplete: result.isComplete,
      offerData: result.offerData,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/session/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
});

module.exports = router;
