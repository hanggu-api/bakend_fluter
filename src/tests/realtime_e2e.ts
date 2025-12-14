import axios from 'axios';
import { io as clientIO, Socket } from 'socket.io-client';

const BASE = 'http://localhost:4002';

async function run() {
  console.log('Starting realtime e2e test...');
  // Register client
  const ts = Date.now();
  const clientEmail = `client_${ts}@test.local`;
  const providerEmail = `provider_${ts}@test.local`;

  const clientReg = await axios.post(`${BASE}/auth/register`, {
    email: clientEmail, password: 'Test1234!', name: 'Client Test', role: 'client'
  });
  const providerReg = await axios.post(`${BASE}/auth/register`, {
    email: providerEmail, password: 'Test1234!', name: 'Provider Test', role: 'provider'
  });

  const clientToken = clientReg.data.token;
  const providerToken = providerReg.data.token;

  const providerSocket = clientIO(BASE, { autoConnect: false });
  const clientSocket = clientIO(BASE, { autoConnect: false });

  let createdServiceId: string | null = null;
  let receivedCreated = false;
  let receivedChat = false;

  providerSocket.on('service.created', (payload: any) => {
    console.log('provider received service.created', payload.id);
    receivedCreated = true;
  });

  const waitConnect = (s: Socket, name: string) => new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error(`${name} connect timeout`)), 5000);
    s.once('connect', () => { clearTimeout(to); resolve(); });
    s.once('connect_error', (err: any) => { clearTimeout(to); reject(err); });
  });
  providerSocket.connect();
  clientSocket.connect();
  await waitConnect(providerSocket, 'provider');
  await waitConnect(clientSocket, 'client');

  // Create service as client
  await axios.post(`${BASE}/services`, {
    category_id: 2,
    description: 'Teste elétrico',
    latitude: -23.55,
    longitude: -46.63,
    address: 'Av Paulista',
    price_estimated: 100,
    price_upfront: 20,
  }, { headers: { Authorization: `Bearer ${clientToken}` } }).then(res => {
    createdServiceId = res.data.id;
    console.log('service created', createdServiceId);
  });

  if (!createdServiceId) throw new Error('Service not created');

  clientSocket.emit('join:service', createdServiceId);
  providerSocket.emit('join:service', createdServiceId);

  providerSocket.on('chat.message', (msg: any) => {
    if (msg.service_id === createdServiceId) {
      console.log('provider received chat.message');
      receivedChat = true;
    }
  });

  await axios.post(`${BASE}/chat/${createdServiceId}`, {
    content: 'Olá do cliente', type: 'text'
  }, { headers: { Authorization: `Bearer ${clientToken}` } });

  await new Promise(res => setTimeout(res, 2000));

  if (!receivedCreated) throw new Error('Provider did not receive service.created');
  if (!receivedChat) throw new Error('Provider did not receive chat.message');

  console.log('Realtime e2e test PASSED');
  providerSocket.close();
  clientSocket.close();
}

run().catch(err => {
  console.error('Realtime e2e test FAILED:', err.message);
  process.exit(1);
});