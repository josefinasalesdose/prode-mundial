const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'mundial2026';

async function dbGet(key) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/prode_data?key=eq.${key}&select=value`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const rows = await r.json();
  return rows.length ? rows[0].value : null;
}

async function dbSet(key, value) {
  await fetch(`${SUPABASE_URL}/rest/v1/prode_data`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    if (req.method === 'GET' && action === 'load') {
      const [members, bets, premios, slots, results] = await Promise.all([
        dbGet('members'), dbGet('bets'), dbGet('premios'), dbGet('slots'), dbGet('results'),
      ]);
      return res.json({
        members: members || ['Jojó','Marcos','Valen','Lucas','Caro','Nico'],
        bets: bets || {},
        premios: premios || {},
        slots: slots || {},
        results: results || { scores: {}, champion: null, awards: {} },
      });
    }

    if (req.method === 'POST' && action === 'save_bet') {
      const { member, champion, scores } = req.body;
      if (!member) return res.status(400).json({ error: 'member required' });
      const bets = await dbGet('bets') || {};
      bets[member] = { champion, scores, updated: new Date().toISOString() };
      await dbSet('bets', bets);
      return res.json({ ok: true });
    }

    if (req.method === 'POST' && action === 'save_premios') {
      const { member, data } = req.body;
      if (!member) return res.status(400).json({ error: 'member required' });
      const premios = await dbGet('premios') || {};
      premios[member] = { ...data, updated: new Date().toISOString() };
      await dbSet('premios', premios);
      return res.json({ ok: true });
    }

    if (req.method === 'POST' && action === 'add_member') {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });
      const members = await dbGet('members') || [];
      if (!members.includes(name)) { members.push(name); await dbSet('members', members); }
      return res.json({ ok: true, members });
    }

    if (req.method === 'POST' && action === 'verify_admin') {
      const { password } = req.body;
      return res.json({ ok: password === ADMIN_PASS });
    }

    if (req.method === 'POST' && action === 'save_slots') {
      const { password, slots } = req.body;
      if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Contraseña incorrecta' });
      await dbSet('slots', slots);
      return res.json({ ok: true });
    }

    if (req.method === 'POST' && action === 'save_results') {
      const { password, scores, champion, awards } = req.body;
      if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Contraseña incorrecta' });
      await dbSet('results', { scores: scores || {}, champion: champion || null, awards: awards || {} });
      return res.json({ ok: true });
    }

    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
