require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const chatRoutes    = require('./routes/chat');
const offerRoutes   = require('./routes/offers');
const documentRoutes= require('./routes/documents');
const clientRoutes  = require('./routes/clients');
const scriptRoutes  = require('./routes/scripts');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 60_000, max: 100 });
app.use('/api/', limiter);

app.use('/api/chat',      chatRoutes);
app.use('/api/offers',    offerRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/clients',   clientRoutes);
app.use('/api/scripts',   scriptRoutes);
app.use('/api/webhooks',  webhookRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Feature-flag endpoint — tells the frontend which services are configured
app.get('/api/config', (req, res) => {
  const provider = process.env.ESIGN_PROVIDER || 'hellosign';
  const esignConfigured =
    (provider === 'hellosign' && !!process.env.HELLOSIGN_API_KEY && process.env.HELLOSIGN_API_KEY !== '...') ||
    (provider === 'docusign'  && !!process.env.DOCUSIGN_ACCOUNT_ID);
  res.json({
    esign: esignConfigured,
    esignProvider: esignConfigured ? provider : null,
    sms: !!(process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.startsWith('AC...')),
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`RealDraft AI backend running on :${PORT}`));
