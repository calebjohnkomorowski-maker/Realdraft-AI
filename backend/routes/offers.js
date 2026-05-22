const express = require('express');
const router = express.Router();
const db = require('../services/supabase');

router.post('/', async (req, res, next) => {
  try {
    const { offerData, agentId } = req.body;

    const property = await db.upsertProperty({
      address: offerData.property_address,
      municipality: offerData.municipality,
      county: offerData.county,
      property_zip: offerData.property_zip,
      tax_id: offerData.tax_id,
      school_district: offerData.school_district,
    });

    const buyer = await db.upsertClient({
      agent_id: agentId,
      name: offerData.buyer_name,
      email: offerData.buyer_email || null,
      phone: offerData.buyer_phone || null,
      role: 'buyer',
    });

    const seller = await db.upsertClient({
      agent_id: agentId,
      name: offerData.seller_name,
      email: offerData.seller_email || null,
      phone: offerData.seller_phone || null,
      role: 'seller',
    });

    const offer = await db.createOffer({
      agent_id: agentId,
      property_id: property.id,
      buyer_id: buyer.id,
      seller_id: seller.id,
      status: 'draft',
      fields: offerData,
    });

    res.status(201).json(offer);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const agentId = req.query.agent_id;
    const offers = await db.listOffers(agentId, {
      status: req.query.status,
      limit: Number(req.query.limit) || 50,
    });
    res.json(offers);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const offer = await db.getOffer(req.params.id);
    res.json(offer);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const offer = await db.updateOffer(req.params.id, req.body);
    res.json(offer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
