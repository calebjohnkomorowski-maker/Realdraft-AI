const express = require('express');
const router = express.Router();
const { generateCallScript } = require('../services/claude');
const db = require('../services/supabase');

router.post('/generate', async (req, res, next) => {
  try {
    const { offerId, offerData, agentName } = req.body;

    const scriptText = await generateCallScript({
      agentName,
      clientName: offerData.buyer_name,
      address: offerData.property_address,
      price: offerData.purchase_price_number,
      deposit: offerData.initial_deposit,
      settlementDate: offerData.settlement_date,
      contingencies: [
        offerData.mortgage_contingency && 'Mortgage Contingency',
        offerData.inspection_home === 'elect' && 'Home Inspection',
        offerData.inspection_radon === 'elect' && 'Radon Test',
      ].filter(Boolean),
      unusualTerms: offerData.seller_assist > 0
        ? [`Seller Assist $${Number(offerData.seller_assist).toLocaleString()}`]
        : [],
    });

    if (offerId) {
      await db.saveCallScript(offerId, scriptText);
    }

    res.json({ script: scriptText });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
