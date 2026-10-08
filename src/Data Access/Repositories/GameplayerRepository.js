import { Game, GamePlayer, User } from '../Models/index.js';
import { Op } from 'sequelize';

class GamePlayerRepository {
    async create(data, options = {}) {
        return GamePlayer.create(data, options);
    }

    async findByGameId(gameId, transaction) {
        return GamePlayer.findAll({
            where: { gameId }, order: [['turnOrder', 'ASC'], ['id', 'ASC']],
            include: [{ model: User, attributes: ['id', 'username'] }],
            transaction,
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

    async findByGameAndUser(gameId, userId, transaction) {
        return GamePlayer.findOne({ where: { gameId, userId }, transaction });
    }

    async findActiveGamesByUserId(userId) {
        return GamePlayer.findAll({
            where: { userId, invitationStatus: { [Op.in]: ['accepted', 'invited'] } },
            include: [{ model: Game, where: { state: { [Op.in]: ['pending', 'in_progress'] } }, attributes: [] }],
        });
    }

    async findParticipantsByGameId(gameId, transaction) {
        return GamePlayer.findAll({
            where: { gameId, invitationStatus: 'accepted' },
            order: [['turnOrder', 'ASC']],
            include: [{ model: User, attributes: ['id', 'username'] }],
            transaction,
        });
    }

    async update(id, data) {
        const player = await GamePlayer.findByPk(id);
        if (!player) return null;
        return player.update(data);
    }

    async updateInvitationStatus(gameId, userId, invitationStatus, transaction) {
        const [updated] = await GamePlayer.update({ invitationStatus }, {
            where: { gameId, userId }, transaction,
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
