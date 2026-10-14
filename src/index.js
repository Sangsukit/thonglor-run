import { createApp } from './server.js';
import { config } from './config.js';
import { migrate } from './db.js';
import { expireUnpaid } from './registrations.js';

await migrate();
const app = createApp();
app.listen(config.port, () => console.log(`Thonglor Run booking listening on :${config.port} (${config.baseUrl})`));

setInterval(() => {
  expireUnpaid().then(n => n && console.log(`expired ${n} unpaid entries`)).catch(e => console.error('expiry job', e.message));
}, 5 * 60e3).unref();
