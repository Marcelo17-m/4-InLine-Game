const gamePlayerModel = (sequelize, DataTypes) => {
    const GamePlayer = sequelize.define(
        'GamePlayer',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            gameId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            piece: {
                type: DataTypes.ENUM('R', 'Y'),
                allowNull: false,
            },
            turnOrder: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: { isInt: true, isIn: [[0, 1]] },
            },
            invitationStatus: {
                type: DataTypes.ENUM('accepted', 'invited', 'rejected', 'abandoned'),
                allowNull: false,
                defaultValue: 'invited',
            },
        },
        {
            tableName: 'game_players',
            timestamps: false,
            indexes: [
                { unique: true, fields: ['gameId', 'userId'] },
                { unique: true, fields: ['gameId', 'turnOrder'], name: 'game_players_game_turn_order' },
            ],
        }
    );

    GamePlayer.associate = (models) => {
        GamePlayer.belongsTo(models.Game, { foreignKey: 'gameId' });
        GamePlayer.belongsTo(models.User, { foreignKey: 'userId' });
    };
 
    return GamePlayer;
};

export default gamePlayerModel;
