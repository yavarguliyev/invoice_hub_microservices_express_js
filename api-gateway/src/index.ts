import { config } from 'dotenv';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

config();

const app = express();
const port = Number(process.env.PORT);

app.use(express.json());

app.use('/invoices', createProxyMiddleware({ target: process.env.INVOICE_ORIGIN_ROUTE, changeOrigin: true }));
app.use('/orders', createProxyMiddleware({ target: process.env.ORDER_ORIGIN_ROUTE, changeOrigin: true }));
app.use('/roles', createProxyMiddleware({ target: process.env.ROLE_ORIGIN_ROUTE, changeOrigin: true }));
app.use('/users', createProxyMiddleware({ target: process.env.USER_ORIGIN_ROUTE, changeOrigin: true }));

app.get('/', (_req, res) => {
  res.json({ message: 'API Gateway is working' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Api gateway running on port ${port}`);
});
