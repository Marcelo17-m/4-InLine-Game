const userModel = (sequelize, DataTypes) => {
    const User = sequelize.define(
        'User',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            username: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true,
                },
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
            },
        },
        {
            tableName: 'users',
            timestamps: true, //it could change to automatize the CreatedAt and UpdatedAt
            createdAt: 'createdAt',
            updatedAt: false,
            defaultScope: { attributes: { exclude: ['password'] } },
            scopes: { withPassword: { attributes: { include: ['password'] } } },
        }
    );

    User.associate = (models) => {
        User.hasMany(models.Score, { foreignKey: 'playerId', as: 'scores' });
        User.hasMany(models.Game, { foreignKey: 'creatorId', as: 'createdGames' });
        User.hasMany(models.GamePlayer, { foreignKey: 'userId' });
        User.belongsToMany(models.Game, {
            through: models.GamePlayer,
            foreignKey: 'userId',
            otherKey: 'gameId',
            as: 'games',
        });
        User.hasMany(models.History, {foreignKey: 'playerId'})
        User.hasMany(models.Game, { foreignKey: 'winnerId', as: 'wonGames', onDelete: 'RESTRICT' });
        User.hasMany(models.Invitation, { foreignKey: 'senderId', as: 'sentInvitations', onDelete: 'CASCADE' });
        User.hasMany(models.Invitation, { foreignKey: 'recipientId', as: 'receivedInvitations', onDelete: 'CASCADE' });
    };

    // Keep the hash available to AuthValidator, but never serialize it in responses.
    User.prototype.toJSON = function () {
        const values = { ...this.get({ plain: true }) };
        delete values.password;
        return values;
    };
    
    return User;
};

export default userModel;
