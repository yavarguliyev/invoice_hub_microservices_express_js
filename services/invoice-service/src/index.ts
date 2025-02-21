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

app.get('/', (_req, res) => {
  res.json({ message: 'Invoice service...' });
});

// app.post('/', async (req, res) => {
//   const { invoiceData } = req.body;

//   try {
//     await KafkaInfrastructure.publish('invoices-topic', JSON.stringify(invoiceData));
//     res.status(201).json({ message: 'Invoice created and event sent', payload: { invoiceData } });
//   } catch (error) {
//     console.error('Failed to publish message:', error);
//     res.status(500).json({ message: 'Error processing invoice' });
//   }
// });

app.get('/:id', (req, res) => {
  res.json({ message: `Invoice with this id: ${req.params.id}...` });
});

app.get('/:id/id/:ref/ref', (req, res) => {
  const status = req.query.status ?? 'status';
  const amount = req.query.amount ?? 'amount';

  res.json({ message: `Invoice with this id: ${req.params.id} has updated this ref number: ${req.params.ref}. And status is ${status}, amount is ${amount}` });
});

app.listen(port, () => console.log(`Invoice service running on port ${port}`));
