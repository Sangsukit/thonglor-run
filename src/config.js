// All runtime settings come from environment variables (see .env.example).
const env = process.env;
const int = (v, d) => (v === undefined || v === '' ? d : parseInt(v, 10));

export const config = {
  port: int(env.PORT, 3000),
  baseUrl: (env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  databaseUrl: env.DATABASE_URL || 'postgres://tgr:tgr@localhost:5432/tgr',
  databaseSsl: env.DATABASE_SSL === 'true',
  trustProxy: env.TRUST_PROXY ?? '1',

  event: {
    name: 'Thonglor Charity Run 2026',
    raceDate: '2026-11-15',
    startTime: '06:00',
    capacity: int(env.CAPACITY, 3000),
    // ISO timestamp; registration closes after this moment (optional)
    closesAt: env.REGISTRATION_CLOSES_AT || null,
    minAge: int(env.MIN_AGE, 10)
  },

  packs: {
    '5K':  { price: 600,  distances: ['5K'],        bibStart: 50001, bibPrefix: '' },
    '10K': { price: 800,  distances: ['10K'],       bibStart: 10001, bibPrefix: '' },
    'VIP': { price: 1200, distances: ['5K', '10K'], bibStart: 1,     bibPrefix: 'V', bibPad: 3 }
  },
  shirtSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],

  // Unpaid entries hold a spot for this many hours, then expire.
  holdHours: int(env.HOLD_HOURS, 24),

  omise: {
    publicKey: env.OMISE_PUBLIC_KEY || '',
    secretKey: env.OMISE_SECRET_KEY || '',
    apiUrl: (env.OMISE_API_URL || 'https://api.omise.co').replace(/\/$/, '')
  },
  // Manual PromptPay fallback (used when Omise keys are not set)
  promptpay: {
    id: env.PROMPTPAY_ID || '',
    name: env.PROMPTPAY_NAME || ''
  },

  admin: {
    password: env.ADMIN_PASSWORD || '',
    sessionSecret: env.SESSION_SECRET || '',
    sessionHours: int(env.ADMIN_SESSION_HOURS, 12)
  },

  mail: {
    smtpUrl: env.SMTP_URL || '',
    from: env.MAIL_FROM || 'Thonglor Charity Run <no-reply@example.com>'
  }
};

export const omiseEnabled = () => Boolean(config.omise.publicKey && config.omise.secretKey);
export const manualPromptpayEnabled = () => !omiseEnabled() && Boolean(config.promptpay.id);
