import { GamePlayer, User } from '../Models/index.js';
import { Op } from 'sequelize';

class GamePlayerRepository {
    async create(data) {
        return GamePlayer.create(data);
    }

    async findByGameId(gameId) {
        return GamePlayer.findAll({
            where: { gameId }, order: [['turnOrder', 'ASC'], ['id', 'ASC']],
            include: [{ model: User, attributes: ['id', 'username'] }],
        });
    }

    async findActiveByGameId(gameId) {
        return GamePlayer.findAll({
            where: {
                gameId,
                invitationStatus: { [Op.in]: ['accepted', 'invited'] },
            },
            order: [['turnOrder', 'ASC'], ['id', 'ASC']],
            include: [{ model: User, attributes: ['id', 'username'] }],
        });
    }

    async findByGameAndUser(gameId, userId) {
        return GamePlayer.findOne({ where: { gameId, userId } });
    }

    async update(id, data) {
        const player = await GamePlayer.findByPk(id);
        if (!player) return null;
        return player.update(data);
    }

    async updateInvitationStatus(gameId, userId, invitationStatus) {
        const [updated] = await GamePlayer.update({ invitationStatus }, {
            where: { gameId, userId },
        });
        return updated === 1;
    }

    async delete(id) {
        const player = await GamePlayer.findByPk(id);
        if (!player) return null;
        await player.destroy();
        return true;
    }
}

export default new GamePlayerRepository();
