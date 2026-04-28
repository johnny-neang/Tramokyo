// Supabase data layer. Uses the service role key — bypasses RLS, intended
// for server-side use only. Never import this from client code.

import { createClient } from '@supabase/supabase-js';

let _client = null;
function client() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return _client;
}

// camelCase ↔ snake_case for the registrations table.
const REG_FIELDS = [
  ['id',                'id'],
  ['submittedAt',       'submitted_at'],
  ['firstName',         'first_name'],
  ['lastName',          'last_name'],
  ['pronouns',          'pronouns'],
  ['email',             'email'],
  ['phone',             'phone'],
  ['experienceName',    'experience_name'],
  ['schedule',          'schedule'],
  ['buildSign',         'build_sign'],
  ['feeAck',            'fee_ack'],
  ['pets',              'pets'],
  ['containerRoom',     'container_room'],
  ['sandman',           'sandman'],
  ['ranger',            'ranger'],
  ['artGrant',          'art_grant'],
  ['sponsor',           'sponsor'],
  ['notes',             'notes'],
  ['liabilityAck',      'liability_ack'],
  ['adminNotes',        'admin_notes'],
  ['paymentReceived',   'payment_received'],
  ['confirmedAttendee', 'confirmed_attendee']
];

export const REG_ADMIN_EDITABLE = [
  'firstName', 'lastName', 'pronouns', 'email', 'phone',
  'experienceName', 'schedule', 'buildSign', 'feeAck',
  'pets', 'containerRoom', 'sandman', 'ranger', 'artGrant',
  'sponsor', 'notes', 'liabilityAck',
  'adminNotes', 'paymentReceived', 'confirmedAttendee'
];

const REG_CAMEL_TO_SNAKE = Object.fromEntries(REG_FIELDS.map(([c, s]) => [c, s]));
const REG_SNAKE_TO_CAMEL = Object.fromEntries(REG_FIELDS.map(([c, s]) => [s, c]));

function rowToCamel(row) {
  const out = {};
  for (const [snake, val] of Object.entries(row)) {
    out[REG_SNAKE_TO_CAMEL[snake] || snake] = val;
  }
  return out;
}

function asBool(v) {
  if (v === true || v === false) return v;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1';
}

/** Insert a registration from the public form payload. */
export async function insertRegistration(p) {
  p = p || {};
  const row = {
    first_name: p.firstName ?? '',
    last_name: p.lastName ?? '',
    pronouns: p.pronouns ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    experience_name: p.experienceName ?? '',
    schedule: p.schedule ?? '',
    build_sign: asBool(p.buildSign),
    fee_ack: asBool(p.feeAck),
    pets: p.pets ?? '',
    container_room: p.containerRoom ?? '',
    sandman: p.sandman ?? '',
    ranger: p.ranger ?? '',
    art_grant: p.artGrant ?? '',
    sponsor: p.sponsor ?? '',
    notes: p.notes ?? '',
    liability_ack: asBool(p.liabilityAck),
    admin_notes: '',
    payment_received: '',
    confirmed_attendee: 'Pending'
  };
  const { data, error } = await client()
    .from('registrations')
    .insert(row)
    .select('id, submitted_at')
    .single();
  if (error) {
    const e = new Error(error.message || 'insert_failed');
    e.status = 500;
    throw e;
  }
  return data; // { id, submitted_at }
}

/** List all registrations, newest first. */
export async function listRegistrations() {
  const { data, error } = await client()
    .from('registrations')
    .select('*')
    .order('submitted_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) {
    const e = new Error(error.message || 'list_failed');
    e.status = 500;
    throw e;
  }
  return (data || []).map(rowToCamel);
}

/** Update a single editable field on one registration row. Returns the new value. */
export async function updateRegistrationField(id, field, value) {
  if (!REG_ADMIN_EDITABLE.includes(field)) {
    const e = new Error('field_not_editable');
    e.status = 400;
    throw e;
  }
  const col = REG_CAMEL_TO_SNAKE[field];
  if (!col) {
    const e = new Error('unknown_field');
    e.status = 400;
    throw e;
  }
  if (['buildSign', 'feeAck', 'liabilityAck'].includes(field)) {
    value = asBool(value);
  } else if (value == null) {
    value = '';
  } else {
    value = String(value);
  }
  if (field === 'confirmedAttendee') {
    const allowed = new Set(['Pending', 'Confirmed', 'Cancelled']);
    if (!allowed.has(value)) {
      const e = new Error('bad_status');
      e.status = 400;
      throw e;
    }
  }
  const { data, error } = await client()
    .from('registrations')
    .update({ [col]: value })
    .eq('id', id)
    .select(col)
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      const e = new Error('not_found');
      e.status = 404;
      throw e;
    }
    const e = new Error(error.message || 'update_failed');
    e.status = 500;
    throw e;
  }
  return data[col];
}

// ---- Programs ----

/** Returns programs ordered by (day, sort_order). */
export async function listPrograms() {
  const { data, error } = await client()
    .from('programs')
    .select('id, day, name, jp, description, time, location, sort_order')
    .order('day', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) {
    const e = new Error(error.message || 'list_programs_failed');
    e.status = 500;
    throw e;
  }
  // Front-end uses {desc, sortOrder}; DB uses {description, sort_order}.
  return (data || []).map(p => ({
    id: p.id,
    day: p.day,
    name: p.name,
    jp: p.jp,
    desc: p.description,
    time: p.time,
    location: p.location,
    sortOrder: p.sort_order
  }));
}

/**
 * Atomically replace the entire programs table with the supplied array.
 * Calls the SECURITY DEFINER function public.replace_programs(jsonb).
 */
export async function replacePrograms(programs) {
  if (!Array.isArray(programs)) {
    const e = new Error('bad_payload');
    e.status = 400;
    throw e;
  }
  // Validate and normalise — surface client-side mistakes before round-trip.
  const cleaned = programs.map(p => {
    const id = String(p.id || '').trim();
    if (!id) {
      const e = new Error('missing_id');
      e.status = 400;
      throw e;
    }
    return {
      id,
      day: Number(p.day) || 0,
      name: String(p.name || ''),
      jp: String(p.jp || ''),
      description: String(p.desc || p.description || ''),
      time: String(p.time || ''),
      location: String(p.location || ''),
      sort_order: Number(p.sortOrder ?? p.sort_order) || 0
    };
  });
  const { data, error } = await client().rpc('replace_programs', { payload: cleaned });
  if (error) {
    const e = new Error(error.message || 'replace_failed');
    e.status = 500;
    throw e;
  }
  return Number(data) || cleaned.length;
}
