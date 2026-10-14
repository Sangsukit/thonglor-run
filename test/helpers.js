// Test env must be set before the app modules load.
process.env.DATABASE_URL ||= 'postgres://tgr:tgr@localhost:5432/tgr_test';
process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'test-pass';
process.env.SESSION_SECRET = 'test-secret-test-secret';
process.env.CAPACITY = '5';
export const validRunner = (over = {}) => ({
  pack: '10K', firstName: 'Somchai', lastName: 'Jaidee', gender: 'M', dateOfBirth: '1990-05-05',
  nationality: 'TH', idNumber: '1101700230708', phone: '081-234-5678', email: 'Somchai@Example.com',
  emergencyName: 'Mali Jaidee', emergencyPhone: '0899999999', shirtSize: 'M', acceptWaiver: true, acceptPdpa: true, ...over
});
// Valid Thai IDs for distinct runners
export function thaiId(seed) {
  const base = String(110000000000 + seed).slice(0, 12);
  let s = 0; for (let i = 0; i < 12; i++) s += Number(base[i]) * (13 - i);
  return base + ((11 - (s % 11)) % 10);
}
