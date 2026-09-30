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

const PORT = process.env.PORT || 3000;

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

        //this successfully creates or updates the table based
        // on the model.
        await sequelize.sync({ alter: true}); //force: true to reset everything to cero
        console.log('Sync models correctly');

        httpServer.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Sockets listening on ws://localhost:${PORT}`);
        });
    } catch (err) {
        logger.error('Couldnt connect to the database:');    
        logger.error(err);                                      
        process.exit(1);
    }
}

startServer();