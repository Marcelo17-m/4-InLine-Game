const invitationModel = (sequelize, DataTypes) => {
    const Invitation = sequelize.define('Invitation', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        gameId: { type: DataTypes.INTEGER, allowNull: false },
        senderId: { type: DataTypes.INTEGER, allowNull: false },
        recipientId: { type: DataTypes.INTEGER, allowNull: false },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
            validate: { isIn: [['pending', 'accepted', 'rejected', 'cancelled']] },
        },
        respondedAt: { type: DataTypes.DATE, allowNull: true },
    }, {
        tableName: 'invitations',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['gameId', 'recipientId'], name: 'invitations_game_recipient' },
            { fields: ['recipientId', 'status'], name: 'invitations_recipient_status' },
        ],
        validate: {
            distinctUsers() {
                if (this.senderId != null && String(this.senderId) === String(this.recipientId)) {
                    throw new Error('An invitation must have different sender and recipient users');
                }
            },
            coherentResponse() {
                if ((this.status === 'pending') !== (this.respondedAt == null)) {
                    throw new Error('Only a resolved invitation has a response timestamp');
                }
            },
        },
    });

    Invitation.associate = (models) => {
        Invitation.belongsTo(models.Game, { foreignKey: 'gameId', onDelete: 'CASCADE' });
        Invitation.belongsTo(models.User, { foreignKey: 'senderId', as: 'sender', onDelete: 'CASCADE' });
        Invitation.belongsTo(models.User, { foreignKey: 'recipientId', as: 'recipient', onDelete: 'CASCADE' });
    };
    return Invitation;
};

export default invitationModel;
