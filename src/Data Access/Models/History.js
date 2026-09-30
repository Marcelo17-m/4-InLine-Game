const historyModel = (sequelize, DataTypes) => {
    const History = sequelize.define(
        'History',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            gameId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            playerId: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            action: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            eventType: {
                type: DataTypes.ENUM('move', 'started', 'finished', 'abandoned'),
                allowNull: false,
                validate: { isIn: [['move', 'started', 'finished', 'abandoned']] },
            },
            row: { type: DataTypes.INTEGER, allowNull: true, validate: { isInt: true, min: 0, max: 5 } },
            column: { type: DataTypes.INTEGER, allowNull: true, validate: { isInt: true, min: 0, max: 6 } },
            moveNumber: { type: DataTypes.INTEGER, allowNull: true, validate: { isInt: true, min: 1, max: 42 } },
        },
        {
            tableName: 'histories',
            timestamps: true, //it could change to automatize the CreatedAt and UpdatedAt
            createdAt: 'createdAt',
            updatedAt: false,
            indexes: [
                { unique: true, fields: ['gameId', 'moveNumber'], name: 'histories_game_move' },
                { fields: ['gameId', 'createdAt', 'id'], name: 'histories_game_time' },
            ],
            validate: {
                coherentMove() {
                    const coordinates = [this.row, this.column, this.moveNumber];
                    if (this.eventType === 'move') {
                        if (this.playerId == null || coordinates.some((value) => value == null)) {
                            throw new Error('A move requires a player, row, column and moveNumber');
                        }
                    } else if (coordinates.some((value) => value != null)) {
                        throw new Error('Only move events can have board coordinates or a moveNumber');
                    }
                },
            },
        }
    );

    History.associate = (models) => {
        History.belongsTo(models.Game, {foreignKey: 'gameId'});
        History.belongsTo(models.User, {foreignKey: 'playerId', as: 'player'});
    };

    return History;
};

export default historyModel;
