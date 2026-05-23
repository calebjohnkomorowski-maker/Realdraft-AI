const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Graceful no-op when Supabase isn't configured
const isConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY &&
  !process.env.SUPABASE_URL.includes('your-project'));

const supabase = isConfigured
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;

if (!isConfigured) {
  console.warn('[Supabase] Not configured — running in memory-only mode. Offers will not persist.');
}

// In-memory fallback store
const memStore = { offers: [], clients: [], properties: [], documents: [], scripts: [] };

// ── Offers ──────────────────────────────────────────────────────────────────

async function createOffer(data) {
  if (!supabase) {
    const offer = { id: uuidv4(), created_at: new Date().toISOString(), status: 'draft', ...data };
    memStore.offers.push(offer);
    return offer;
  }
  const { data: offer, error } = await supabase.from('offers').insert(data).select().single();
  if (error) throw error;
  return offer;
}

async function updateOffer(id, data) {
  if (!supabase) {
    const idx = memStore.offers.findIndex(o => o.id === id);
    if (idx !== -1) memStore.offers[idx] = { ...memStore.offers[idx], ...data };
    return memStore.offers[idx] || { id, ...data };
  }
  const { data: offer, error } = await supabase.from('offers').update(data).eq('id', id).select().single();
  if (error) throw error;
  return offer;
}

async function getOffer(id) {
  if (!supabase) {
    return memStore.offers.find(o => o.id === id) || null;
  }
  const { data, error } = await supabase
    .from('offers')
    .select('*, properties(*), buyer:clients!offers_buyer_id_fkey(*), seller:clients!offers_seller_id_fkey(*), documents(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function updateOfferByEnvelope(envelopeId, data) {
  if (!supabase) {
    const offer = memStore.offers.find(o => o.envelope_id === envelopeId);
    if (offer) Object.assign(offer, data);
    return offer || null;
  }
  const { data: offer, error } = await supabase
    .from('offers')
    .update(data)
    .eq('envelope_id', envelopeId)
    .select()
    .single();
  if (error) throw error;
  return offer;
}

async function listOffers(agentId, { status, limit = 50, offset = 0 } = {}) {
  if (!supabase) {
    let results = memStore.offers.filter(o => o.agent_id === agentId);
    if (status) results = results.filter(o => o.status === status);
    return results.slice(offset, offset + limit);
  }
  let query = supabase
    .from('offers')
    .select('*, properties(address, municipality), buyer:clients!offers_buyer_id_fkey(name, email, phone), seller:clients!offers_seller_id_fkey(name, email, phone)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ── Clients ──────────────────────────────────────────────────────────────────

async function upsertClient(data) {
  if (!supabase) {
    const existing = memStore.clients.find(c => c.agent_id === data.agent_id && c.email === data.email);
    if (existing) return existing;
    const client = { id: uuidv4(), created_at: new Date().toISOString(), ...data };
    memStore.clients.push(client);
    return client;
  }
  const { data: client, error } = await supabase
    .from('clients').upsert(data, { onConflict: 'agent_id,email' }).select().single();
  if (error) throw error;
  return client;
}

async function listClients(agentId) {
  if (!supabase) return memStore.clients.filter(c => c.agent_id === agentId);
  const { data, error } = await supabase.from('clients').select('*').eq('agent_id', agentId).order('name');
  if (error) throw error;
  return data;
}

// ── Properties ───────────────────────────────────────────────────────────────

async function upsertProperty(data) {
  if (!supabase) {
    const existing = memStore.properties.find(p => p.address === data.address);
    if (existing) return existing;
    const property = { id: uuidv4(), created_at: new Date().toISOString(), ...data };
    memStore.properties.push(property);
    return property;
  }
  const { data: property, error } = await supabase
    .from('properties').upsert(data, { onConflict: 'address,property_zip' }).select().single();
  if (error) throw error;
  return property;
}

// ── Documents ────────────────────────────────────────────────────────────────

async function createDocument(data) {
  if (!supabase) {
    const doc = { id: uuidv4(), created_at: new Date().toISOString(), ...data };
    memStore.documents.push(doc);
    return doc;
  }
  const { data: doc, error } = await supabase.from('documents').insert(data).select().single();
  if (error) throw error;
  return doc;
}

async function updateDocument(id, data) {
  if (!supabase) {
    const idx = memStore.documents.findIndex(d => d.id === id);
    if (idx !== -1) memStore.documents[idx] = { ...memStore.documents[idx], ...data };
    return memStore.documents[idx] || { id, ...data };
  }
  const { data: doc, error } = await supabase.from('documents').update(data).eq('id', id).select().single();
  if (error) throw error;
  return doc;
}

async function uploadPDF(offerId, type, pdfBytes) {
  if (!supabase) {
    // Return a data URL so PDF preview still works without storage
    const b64 = Buffer.from(pdfBytes).toString('base64');
    return `data:application/pdf;base64,${b64}`;
  }
  const filename = `${offerId}/${type}-${Date.now()}.pdf`;
  const { error } = await supabase.storage
    .from('documents')
    .upload(filename, pdfBytes, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filename);
  return publicUrl;
}

// ── Call Scripts ──────────────────────────────────────────────────────────────

async function saveCallScript(offerId, scriptText) {
  if (!supabase) {
    const s = { id: uuidv4(), offer_id: offerId, script_text: scriptText, created_at: new Date().toISOString() };
    memStore.scripts.push(s);
    return s;
  }
  const { data, error } = await supabase.from('call_scripts').insert({ offer_id: offerId, script_text: scriptText }).select().single();
  if (error) throw error;
  return data;
}

// ── Agents ────────────────────────────────────────────────────────────────────

async function getAgent(id) {
  if (!supabase) return { id, name: 'Demo Agent', brokerage: 'Demo Brokerage' };
  const { data, error } = await supabase.from('agents').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

module.exports = {
  createOffer, updateOffer, updateOfferByEnvelope, getOffer, listOffers,
  upsertClient, listClients,
  upsertProperty,
  createDocument, updateDocument, uploadPDF,
  saveCallScript,
  getAgent,
  isConfigured,
};
