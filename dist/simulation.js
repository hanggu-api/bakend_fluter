"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const API_URL = 'http://localhost:4002';
// Utility logging with colors
const log = (step, msg) => console.log(`\x1b[36m[${step}]\x1b[0m ${msg}`);
const success = (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
const error = (msg, err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error(`\x1b[31m❌ ${msg}\x1b[0m`, status ? `status=${status}` : '', data || err.message || err);
};
async function runSimulation() {
    try {
        const suffix = Math.floor(Math.random() * 1000);
        const clientEmail = `client${suffix}@test.com`;
        const providerEmail = `provider${suffix}@test.com`;
        const password = 'securePass123!';
        // 1. Register Client
        log('STEP 1', `Registering Client: ${clientEmail}`);
        const regClient = await axios_1.default.post(`${API_URL}/auth/register`, {
            email: clientEmail,
            password,
            name: 'João Cliente',
            role: 'client',
            phone: '11999990000'
        });
        const clientToken = regClient.data.token;
        success(`Client registered (ID: ${regClient.data.user.id})`);
        // 2. Register Provider
        log('STEP 2', `Registering Provider: ${providerEmail}`);
        const regProvider = await axios_1.default.post(`${API_URL}/auth/register`, {
            email: providerEmail,
            password,
            name: 'Maria Provider',
            role: 'provider',
            phone: '11988880000'
        });
        const providerToken = regProvider.data.token;
        success(`Provider registered (ID: ${regProvider.data.user.id})`);
        // 3. Client Creates Service
        log('STEP 3', 'Client creating a "Fix Sink" service request...');
        const createService = await axios_1.default.post(`${API_URL}/services`, {
            category_id: 1, // Encanamento
            description: 'Pia vazando muito na cozinha',
            latitude: -23.550520,
            longitude: -46.633308,
            address: 'Rua Augusta, 1000',
            price_estimated: 150.00,
            price_upfront: 45.00
        }, { headers: { Authorization: `Bearer ${clientToken}` } });
        const serviceId = createService.data.id;
        success(`Service Created (ID: ${serviceId})`);
        // 4. Provider Check Pending Services
        log('STEP 4', 'Provider checking available services...');
        const available = await axios_1.default.get(`${API_URL}/services/available`, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        const found = available.data.services.find((s) => s.id === serviceId);
        if (found) {
            success('Provider found the new service within pending list.');
        }
        else {
            throw new Error('Service not found in provider list');
        }
        // 5. Provider Accepts Service
        log('STEP 5', 'Provider accepting the service...');
        await axios_1.default.post(`${API_URL}/services/${serviceId}/accept`, {}, { headers: { Authorization: `Bearer ${providerToken}` } });
        success('Service Accepted successfully!');
        // 6. Chat Exchange
        log('STEP 6', 'Simulating Chat...');
        // Client sends message
        await axios_1.default.post(`${API_URL}/chat/${serviceId}`, { content: 'Olá, pode vir hoje?' }, { headers: { Authorization: `Bearer ${clientToken}` } });
        // Provider replies
        await axios_1.default.post(`${API_URL}/chat/${serviceId}`, { content: 'Sim, chego em 30min.' }, { headers: { Authorization: `Bearer ${providerToken}` } });
        // Verify messages
        const messages = await axios_1.default.get(`${API_URL}/chat/${serviceId}`, { headers: { Authorization: `Bearer ${clientToken}` } });
        if (messages.data.messages.length >= 2) {
            success(`Chat verified. Messages count: ${messages.data.messages.length}`);
        }
        else {
            throw new Error('Chat messages check failed');
        }
        console.log('\n\x1b[32m✨ FULL SIMULATION COMPLETED SUCCESSFULLY! ✨\x1b[0m');
    }
    catch (err) {
        error('Simulation Failed', err);
        process.exit(1);
    }
}
async function runLoadTest() {
    const password = 'securePass123!';
    const clients = [];
    const providers = [];
    const services = [];
    const numClients = 5;
    const numProviders = 5;
    const servicesPerClient = 2;
    try {
        for (let i = 0; i < numClients; i++) {
            const email = `client_${Date.now()}_${i}@test.com`;
            log('REGISTER', `Client ${email}`);
            const reg = await axios_1.default.post(`${API_URL}/auth/register`, {
                email,
                password,
                name: `Cliente ${i}`,
                role: 'client',
                phone: `1190000${String(i).padStart(4, '0')}`
            });
            clients.push({ id: reg.data.user.id, token: reg.data.token, email });
        }
        for (let i = 0; i < numProviders; i++) {
            const email = `provider_${Date.now()}_${i}@test.com`;
            log('REGISTER', `Provider ${email}`);
            const reg = await axios_1.default.post(`${API_URL}/auth/register`, {
                email,
                password,
                name: `Prestador ${i}`,
                role: 'provider',
                phone: `1191000${String(i).padStart(4, '0')}`
            });
            providers.push({ id: reg.data.user.id, token: reg.data.token, email });
        }
        for (const c of clients) {
            for (let k = 0; k < servicesPerClient; k++) {
                const lat = -23.55 + Math.random() * 0.01;
                const lng = -46.63 + Math.random() * 0.01;
                const priceEst = 100 + Math.floor(Math.random() * 200);
                const priceUp = Math.floor(priceEst * 0.3);
                const desc = `Serviço ${(0, uuid_1.v4)().slice(0, 6)} descrição realista ${k}`;
                const create = await axios_1.default.post(`${API_URL}/services`, {
                    category_id: (k % 3) + 1,
                    description: desc,
                    latitude: lat,
                    longitude: lng,
                    address: `Rua Teste ${k}, 123`,
                    price_estimated: priceEst,
                    price_upfront: priceUp
                }, { headers: { Authorization: `Bearer ${c.token}` } });
                services.push({ id: create.data.id, clientId: c.id });
                success(`Service created ${create.data.id} by client ${c.email}`);
            }
        }
        for (const s of services) {
            const prov = providers[Math.floor(Math.random() * providers.length)];
            try {
                await axios_1.default.post(`${API_URL}/services/${s.id}/accept`, {}, { headers: { Authorization: `Bearer ${prov.token}` } });
                success(`Service ${s.id} accepted by ${prov.email}`);
            }
            catch (e) {
                const st = e?.response?.status;
                if (st === 409) {
                    log('ACCEPT', `Service ${s.id} already taken`);
                }
                else {
                    throw e;
                }
            }
        }
        for (const s of services) {
            const prov = providers[Math.floor(Math.random() * providers.length)];
            const client = clients.find((c) => c.id === s.clientId) || clients[0];
            const msgs = [
                { from: 'client', content: 'Olá! Preciso de ajuda urgente.' },
                { from: 'provider', content: 'Consigo passar aí hoje.' },
                { from: 'client', content: 'Perfeito, aguardo.' }
            ];
            for (const m of msgs) {
                const token = m.from === 'client' ? client.token : prov.token;
                await axios_1.default.post(`${API_URL}/chat/${s.id}`, { content: m.content }, { headers: { Authorization: `Bearer ${token}` } });
            }
            const verify = await axios_1.default.get(`${API_URL}/chat/${s.id}`, { headers: { Authorization: `Bearer ${client.token}` } });
            if ((verify.data.messages?.length || 0) >= msgs.length) {
                success(`Chat ok for service ${s.id} (${verify.data.messages.length} msgs)`);
            }
            else {
                throw new Error(`Chat failed for ${s.id}`);
            }
        }
        success(`Load test completed: clients=${clients.length}, providers=${providers.length}, services=${services.length}`);
        console.log('\n\x1b[32m✨ EXTENSIVE LOAD TEST COMPLETED SUCCESSFULLY! ✨\x1b[0m');
    }
    catch (err) {
        error('Load Test Failed', err);
        process.exit(1);
    }
}
runLoadTest();
