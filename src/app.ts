import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import serviceRoutes from './routes/services';
import chatRoutes from './routes/chat';
import mediaRoutes from './routes/media';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/services', serviceRoutes);
app.use('/chat', chatRoutes);
app.use('/media', mediaRoutes);

app.get('/', (_req, res) => {
  res.send('Conserta+ API Running (Serverless)');
});

export default app;