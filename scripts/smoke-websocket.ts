import WebSocket from 'ws';
const origin = process.argv[2] ?? 'http://localhost:8788';
const healthResponse=await fetch(origin+'/api/health');
const health=await healthResponse.json() as {runtime?:string;ok?:boolean};
if(!healthResponse.ok||!health.ok||health.runtime!=='durable-object')throw new Error('Unexpected HanPlay runtime');
const sessionResponse=await fetch(origin+'/api/auth/session');
const session=await sessionResponse.json() as {teacher:unknown;clientId?:string};
if(!sessionResponse.ok||session.teacher!==null||!session.clientId?.endsWith('.apps.googleusercontent.com'))throw new Error('Unexpected anonymous auth response');
console.log('PASS: Durable Object health and configured anonymous Google auth.');
const ws = new WebSocket(origin.replace(/^http/, 'ws') + '/api/socket', {
  headers: { Origin: origin },
});
const timer = setTimeout(() => {
  console.error('WebSocket smoke timeout');
  ws.terminate();
  process.exitCode = 1;
}, 10000);
ws.on('open', () => ws.send(JSON.stringify({ id: 1, event: 'create', data: {} })));
ws.on('message', (raw) => {
  const data = JSON.parse(raw.toString());
  if (data.id !== 1) return;
  if (!data.reply?.error?.includes('đăng nhập')) {
    console.error('Anonymous create was not rejected');
    process.exitCode = 1;
  } else console.log('PASS: WebSocket connected; unauthenticated room creation rejected.');
  clearTimeout(timer);
  ws.terminate();
});
ws.on('error', (error) => {
  console.error(error.message);
  clearTimeout(timer);
  process.exitCode = 1;
});
