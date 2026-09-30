import { History, User } from '../Models/index.js';

class HistoryRepository {
    async create(data) {
        return History.create(data);
    }

    async findByGameId(gameId) {
        return History.findAll({
            where: { gameId },
            order: [['createdAt', 'ASC'], ['id', 'ASC']],
            include: [{ model: User, as: 'player', attributes: ['id', 'username'] }],
        });
    }

    async findMovesByGameId(gameId) {
        return History.findAll({
            where: { gameId, eventType: 'move' }, order: [['moveNumber', 'ASC']],
        });
    }

}

export default new HistoryRepository();
