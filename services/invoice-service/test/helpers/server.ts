import { createExpressServer } from 'routing-controllers';
import http from 'http';

let server: http.Server;

interface ServerOptions {
  port?: number;
}

export async function startTestServer (options: ServerOptions = {}): Promise<string> {
  const port = options.port || 4002;

  try {
    const app = createExpressServer({
      cors: true,
      controllers: [
        __dirname + '/../../src/api/v1/*.controller.ts'
      ],
      middlewares: [],
      validation: true,
      defaultErrorHandler: true
    });

    server = http.createServer(app);

    return new Promise((resolve) => {
      server.listen(port, () => {
        console.log(`Test server running on port ${port}`);
        resolve(`http://localhost:${port}`);
      });
    });
  } catch (error) {
    console.error('Failed to start test server:', error);
    throw error;
  }
}

export async function stopTestServer (): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) {
          console.error('Error closing server:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
