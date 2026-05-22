const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ── Offers ──────────────────────────────────────────────────────────────────

async function createOffer(data) {
  const { data: offer, error } = await supabase
    .from('offers')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return offer;
}

async function updateOffer(id, data) {
  const { data: offer, error } = await supabase
    .from('offers')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return offer;
}

async function getOffer(id) {
  const { data, error } = await supabase
    .from('offers')
    .select('*, clients(*), properties(*), documents(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function listOffers(agentId, { status, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('offers')
    .select('*, properties(address, municipality), clients(name, email, phone)')
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
  const { data: client, error } = await supabase
    .from('clients')
    .upsert(data, { onConflict: 'agent_id,email' })
    .select()
    .single();
  if (error) throw error;
  return client;
}

async function listClients(agentId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('agent_id', agentId)
    .order('name');
  if (error) throw error;
  return data;
}

// ── Properties ───────────────────────────────────────────────────────────────

async function upsertProperty(data) {
  const { data: property, error } = await supabase
    .from('properties')
    .upsert(data, { onConflict: 'address,property_zip' })
    .select()
    .single();
  if (error) throw error;
  return property;
}

// ── Documents ────────────────────────────────────────────────────────────────

async function createDocument(data) {
  const { data: doc, error } = await supabase
    .from('documents')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return doc;
}

async function updateDocument(id, data) {
  const { data: doc, error } = await supabase
    .from('documents')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return doc;
}

async function uploadPDF(offerId, type, pdfBytes) {
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
  const { data, error } = await supabase
    .from('call_scripts')
    .insert({ offer_id: offerId, script_text: scriptText })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Agents ────────────────────────────────────────────────────────────────────

async function getAgent(id) {
  const { data, error } = await supabase.from('agents').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

module.exports = {
  createOffer, updateOffer, getOffer, listOffers,
  upsertClient, listClients,
  upsertProperty,
  createDocument, updateDocument, uploadPDF,
  saveCallScript,
  getAgent,
};
