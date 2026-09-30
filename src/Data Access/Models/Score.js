const scoreModel = (sequelize, DataTypes) => {
    const Score = sequelize.define(
        'Score',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            playerId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            gameId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            outcome: {
                type: DataTypes.ENUM('win', 'loss', 'draw'),
                allowNull: false,
                validate: { isIn: [['win', 'loss', 'draw']] },
            },
        },
        {
            tableName: 'scores',
            timestamps: true, //it could change to automatize the CreatedAt and UpdatedAt
            createdAt: 'timestamp',
            updatedAt: false,
            indexes: [
                { unique: true, fields: ['gameId', 'playerId'], name: 'scores_game_player' },
                { fields: ['playerId', 'outcome'], name: 'scores_player_outcome' },
            ],
        }
    );

    Score.associate = (models) => {
        Score.belongsTo(models.User, {foreignKey: 'playerId', as: 'player'});
        Score.belongsTo(models.Game, {foreignKey: 'gameId'});
    };

    return Score;

};

export default scoreModel;
