import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
// import { KafkaInfrastructure } from '@invoice-hub/common-packages';

config();

const app = express();
const port = process.env.PORT;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

// KafkaInfrastructure.initialize().catch((err) => console.error('Error initializing Kafka:', err));

// KafkaInfrastructure.subscribe('invoices-topic', (message) => {
//   const invoiceData = JSON.parse(message);

//   console.log('Received invoice data:', invoiceData);
//   console.log(`Processing order for invoice ${invoiceData.id}`);
// });

app.get('/', (_req, res) => {
  res.json({ message: 'Order service' });
});

app.listen(port, () => console.log(`Order service running on port ${port}`));
