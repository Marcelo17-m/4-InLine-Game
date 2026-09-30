import { Score } from '../Models/index.js';

class ScoreRepository {
    async create(data) {
        return Score.create(data);
    }

    async findAll() {
        return Score.findAll();
    }

    async findById(id) {
        return Score.findByPk(id);
    }

    async findByPlayerId(playerId) {
        return Score.findAll({ where: { playerId } });
    }

    async findByGameId(gameId) {
        return Score.findAll({ where: { gameId }, order: [['playerId', 'ASC']] });
    }

    async findByGameAndPlayer(gameId, playerId) {
        return Score.findOne({ where: { gameId, playerId } });
    }

    async update(id, data) {
        const score = await Score.findByPk(id);
        if (!score) return null;
        return score.update(data);
    }

    async delete(id) {
        const score = await Score.findByPk(id);
        if (!score) return null;
        await score.destroy();
        return true;
    }
}

export default new ScoreRepository();
