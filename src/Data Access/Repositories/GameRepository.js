import { Game } from '../Models/index.js';

class GameRepository {
    async create(data, options = {}) {
        return Game.create(data, options);
    }

    async findAll() {
        return Game.findAll();
    }

    async findById(id) {
        return Game.findByPk(id);
    }

    async findByIdForUpdate(id, transaction) {
        return Game.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    }

    async findByState(state) {
        return Game.findAll({ where: { state }, order: [['id', 'ASC']] });
    }

    async update(id, data, options = {}) {
        const game = await Game.findByPk(id, options);
        if (!game) return null;
        return game.update(data, options);
    }

    async delete(id) {
        const game = await Game.findByPk(id);
        if (!game) return null;
        await game.destroy();
        return true;
    }
}

export default new GameRepository();
