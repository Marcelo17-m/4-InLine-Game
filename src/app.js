import express from 'express';
import apiRoutes from './Presentation/Routes/index.js'; //way to import the 4 files
import { errorHandler } from './Middleware/errorHandler.js';
import { trackingMiddleware } from './Middleware/trackingMiddleware.js';

const app = express();

app.use(express.json()); 
app.use(trackingMiddleware);//before all the routes
app.use('/api', apiRoutes);

//generic route for when it fails
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

//initialiazing the middleware
app.use(errorHandler);

export default app;