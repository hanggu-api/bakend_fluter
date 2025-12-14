"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const auth_1 = __importDefault(require("./routes/auth"));
const services_1 = __importDefault(require("./routes/services"));
const chat_1 = __importDefault(require("./routes/chat"));
const media_1 = __importDefault(require("./routes/media"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4002;
const httpServer = http_1.default.createServer(app);
exports.io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});
exports.io.on('connection', (socket) => {
    socket.on('auth', (payload) => {
        if (payload?.userId) {
            socket.join(`user:${payload.userId}`);
        }
    });
    socket.on('join:service', (serviceId) => {
        if (serviceId)
            socket.join(`service:${serviceId}`);
    });
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/auth', auth_1.default);
app.use('/services', services_1.default);
app.use('/chat', chat_1.default);
app.use('/media', media_1.default);
app.get('/', (req, res) => {
    res.send('Conserta+ API Running (MySQL)');
});
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
