import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import sequelize from './Data Access/database.js';
import socketAuthMiddleware from './Middleware/socketAuthMiddleware.js';
import { registerGameSocketHandlers } from './Presentation/Sockets/gameSocketHandlers.js';
import logger from './Helpers/logger.js';

process.on('uncaughtException', (err) => {                    
    logger.error('UNCAUGHT EXCEPTION! Cerrando el proceso...');
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {          
    logger.error('UNHANDLED REJECTION! Cerrando el proceso...');
    logger.error(err);
    process.exit(1);
});

// Windows can reserve port ranges for system services; 3000 may be unavailable.
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

//Express is still the same app as always we are just wrapping it up in a http.Server
//to use the Socket.IO next to it
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: { origin: '*' }, // i need to adjust this to the real domain whe it deploys
});

io.use(socketAuthMiddleware);
registerGameSocketHandlers(io);

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Connection to MySQL established');

        await sequelize.sync({ alter: true}); //force: true to reset everything to cero
        console.log('Sync models correctly');

        httpServer.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);
            console.log(`Sockets listening on ws://${HOST}:${PORT}`);
        });
    } catch (err) {
        logger.error('Couldnt connect to the database:');    
        logger.error(err);                                      
        process.exit(1);
    }
}

startServer();
