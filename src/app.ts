import dotenv from 'dotenv';
dotenv.config();
import express, {Request, Response} from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import {createProxyMiddleware} from 'http-proxy-middleware';
import {ClientRequest} from 'http';

import {notFound, errorHandler} from './middlewares';
import api from './api';
import {MessageResponse} from './types/Messages';

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.disable('x-powered-by');

app.get<{}, MessageResponse>('/', (_req: Request, res: Response) => {
  res.json({
    message: 'API location: api/v1',
  });
});

app.use('/api/v1', api);

const services = [
  {
    route: '/api1',
    target: 'https://dog.ceo/api/breeds/image/random',
  },
  {
    route: '/api2',
    target: 'https://jsonplaceholder.typicode.com/posts',
  },
  {
    route: '/weather',
    target: 'https://api.openweathermap.org/data/2.5/weather',
    on: {
      proxyReq: (proxyReq: ClientRequest) => {
        const apiKey = process.env.API_KEY;
        proxyReq.path += `&appid=${apiKey}`;
      },
    },
  },
];

services.forEach(({route, target, on}) => {
  const proxyOptions = {
    on,
    target,
    changeOrigin: true,
    pathRewrite: {
      // Remove the leading slash from the route
      [`^${route}`]: '',
    },
    secure: process.env.NODE_ENV === 'production',
  };

  app.use(route, createProxyMiddleware(proxyOptions));
});

app.use(notFound);
app.use(errorHandler);

export default app;
