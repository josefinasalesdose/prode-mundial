import { kv } from '@vercel/kv';

const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'mundial2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    // GET all data
    if (req.method === 'GET' && action === 'load') {
      const [members, bets, premios, slots] = await Promise.all([
        kv.get('prode:members'),
        kv.get('prode:bets'),
        kv.get('prode:premios'),
        kv.get('prode:slots'),
      ]);
      return res.json({
        members: members || ['Jojó','Marcos','Valen','Lucas','Caro','Nico'],
        bets: bets || {},
        premios: premios || {},
        slots: slots || {},
      });
    }

    // POST save bets for one member
    if (req.method === 'POST' && action === 'save_bet') {
      const { member, champion, scores } = req.body;
      if (!member) return res.status(400).json({ error: 'member required' });
      const bets = await kv.get('prode:bets') || {};
      bets[member] = { champion, scores, updated: new Date().toISOString() };
      await kv.set('prode:bets', bets);
      return res.json({ ok: true });
    }

    // POST save premios for one member
    if (req.method === 'POST' && action === 'save_premios') {
      const { member, data } = req.body;
      if (!member) return res.status(400).json({ error: 'member required' });
      const premios = await kv.get('prode:premios') || {};
      premios[member] = { ...data, updated: new Date().toISOString() };
      await kv.set('prode:premios', premios);
      return res.json({ ok: true });
    }

    // POST add member
    if (req.method === 'POST' && action === 'add_member') {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });
      const members = await kv.get('prode:members') || [];
      if (!members.includes(name)) {
        members.push(name);
        await kv.set('prode:members', members);
      }
      return res.json({ ok: true, members });
    }

    // POST admin: update slots (requires password)
    if (req.method === 'POST' && action === 'save_slots') {
      const { password, slots } = req.body;
      if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Contraseña incorrecta' });
      await kv.set('prode:slots', slots);
      return res.json({ ok: true });
    }

    // POST admin: verify password
    if (req.method === 'POST' && action === 'verify_admin') {
      const { password } = req.body;
      return res.json({ ok: password === ADMIN_PASS });
    }

    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
