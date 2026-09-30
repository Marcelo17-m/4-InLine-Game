process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_jest_only';
 
jest.mock('../Data Access/database.js', () => {
    const { Sequelize } = require('sequelize');
    return {
        __esModule: true,
        default: new Sequelize({
            dialect: 'sqlite',
            storage: ':memory:',
            logging: false,
            // sqlite :memory: crea una base nueva por cada conexión del pool;
            // si el pool tiene más de una, unas queries van a una base y otras
            // a otra, y los tests fallan de forma intermitente. Con max: 1
            // forzamos que todo el archivo de test use la misma conexión.
            pool: { max: 1 },
        }),
    };
});