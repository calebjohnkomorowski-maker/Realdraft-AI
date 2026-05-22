const express = require('express');
const router = express.Router();
const db = require('../services/supabase');

router.get('/', async (req, res, next) => {
  try {
    const clients = await db.listClients(req.query.agent_id);
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const client = await db.upsertClient(req.body);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
