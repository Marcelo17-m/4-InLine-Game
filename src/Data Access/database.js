import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
 
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306, // just in case it doesn't found it
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false,
    }
);

export default sequelize;