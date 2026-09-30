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
            joinedAt: {
                type:DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            // Identifies the player's piece in the board matrix.
            playerNumber: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: { isInt: true, isIn: [[1, 2]] },
            },
            leftAt: { type: DataTypes.DATE, allowNull: true },
        },
        {
            tableName: 'game_players',
            timestamps: false,
            indexes: [
                { unique: true, fields: ['gameId', 'userId']},
                { unique: true, fields: ['gameId', 'playerNumber'], name: 'game_players_game_number' },
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
