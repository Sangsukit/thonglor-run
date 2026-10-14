import { z } from 'zod';
import { config } from './config.js';

export function thaiIdValid(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

export function ageOn(dateOfBirth, onDate = config.event.raceDate) {
  const d = new Date(dateOfBirth + 'T00:00:00Z');
  const r = new Date(onDate + 'T00:00:00Z');
  let age = r.getUTCFullYear() - d.getUTCFullYear();
  const beforeBirthday = r.getUTCMonth() < d.getUTCMonth() ||
    (r.getUTCMonth() === d.getUTCMonth() && r.getUTCDate() < d.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

const text = (max) => z.string().trim().min(1, 'required').max(max);
const phone = z.string().trim().transform(s => s.replace(/[\s()-]/g, ''))
  .refine(s => /^\+?\d{9,15}$/.test(s), 'invalid phone number');

const baseSchema = z.object({
  pack: z.enum(['5K', '10K', 'VIP']),
  distance: z.enum(['5K', '10K']).optional(),
  firstName: text(60),
  lastName: text(60),
  bibName: z.string().trim().max(12).optional().default(''),
  gender: z.enum(['M', 'F', 'X']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD'),
  nationality: z.enum(['TH', 'OTHER']),
  idNumber: z.string().trim().transform(s => s.replace(/[\s-]/g, '').toUpperCase()),
  phone,
  email: z.string().trim().toLowerCase().pipe(z.email('invalid email')).pipe(z.string().max(120)),
  emergencyName: text(80),
  emergencyPhone: phone,
  medical: z.string().trim().max(500).optional().default(''),
  shirtSize: z.enum(config.shirtSizes),
  acceptWaiver: z.literal(true, { message: 'must accept the waiver' }),
  acceptPdpa: z.literal(true, { message: 'must accept the PDPA consent' })
});

// Cross-field checks run on the raw input too, so a runner sees every problem at once.
function extraChecks(v, add) {
  const nat = v.nationality, id = String(v.idNumber ?? '').replace(/[\s-]/g, '').toUpperCase();
  if (nat === 'TH' && !thaiIdValid(id)) add('idNumber', 'invalid Thai ID number');
  if (nat === 'OTHER' && !/^[A-Z0-9]{6,20}$/.test(id)) add('idNumber', 'invalid passport number');
  if (typeof v.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.dateOfBirth)) {
    const dob = new Date(v.dateOfBirth + 'T00:00:00Z');
    if (Number.isNaN(dob.getTime())) add('dateOfBirth', 'invalid date');
    else {
      const age = ageOn(v.dateOfBirth);
      if (age < config.event.minAge) add('dateOfBirth', `must be at least ${config.event.minAge} on race day`);
      if (age > 100) add('dateOfBirth', 'check the date of birth');
    }
  }
  const pack = config.packs[v.pack];
  if (pack && v.distance !== undefined && !pack.distances.includes(v.distance)) add('distance', `${v.pack} runs ${pack.distances.join(' or ')}`);
}

export function validateRegistration(body) {
  const fields = {};
  const add = (k, m) => { if (!fields[k]) fields[k] = m; };
  const parsed = baseSchema.safeParse(body);
  if (!parsed.success) for (const i of parsed.error.issues) add(i.path.join('.') || '_', i.message);
  extraChecks(body || {}, add);
  return Object.keys(fields).length ? { fields } : { data: parsed.data };
}
