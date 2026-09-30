import { Invitation } from '../Models/index.js';

class InvitationRepository {
    async create(data) {
        return Invitation.create(data);
    }

    async findById(id) {
        return Invitation.findByPk(id);
    }

    async findByGameId(gameId) {
        return Invitation.findAll({ where: { gameId }, order: [['id', 'ASC']] });
    }

    async findPendingByRecipientId(recipientId) {
        return Invitation.findAll({
            where: { recipientId, status: 'pending' }, order: [['createdAt', 'ASC'], ['id', 'ASC']],
        });
    }

    // Authorization and joining a match belong to the service using this repository.
    async respond(id, recipientId, status) {
        if (!['accepted', 'rejected'].includes(status)) {
            throw new Error('An invitation response must be accepted or rejected');
        }
        const [updated] = await Invitation.update({ status, respondedAt: new Date() }, {
            where: { id, recipientId, status: 'pending' },
        });
        return updated === 1;
    }

    async cancelPendingByGameId(gameId) {
        const [updated] = await Invitation.update({ status: 'cancelled', respondedAt: new Date() }, {
            where: { gameId, status: 'pending' },
        });
        return updated;
    }
}

export default new InvitationRepository();
