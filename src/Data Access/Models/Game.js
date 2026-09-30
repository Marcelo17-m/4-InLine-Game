import { createEmptyBoard, validateBoard } from '../connectFourSchema.js';

const gameModel = (sequelize, DataTypes) => {
    const Game = sequelize.define(
        'Game',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            rules: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            creatorId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            state: {
                type: DataTypes.ENUM('waiting', 'in_progress', 'finished'),
                allowNull: false,
                defaultValue: 'waiting',
                validate: { isIn: [['waiting', 'in_progress', 'finished']] },
            },
            currentPlayerId:{
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            board: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: createEmptyBoard,
                validate: { validBoard: validateBoard },
            },
            winnerId: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            finishReason: {
                type: DataTypes.ENUM('connect_four', 'draw', 'forfeit'),
                allowNull: true,
                validate: { isIn: [['connect_four', 'draw', 'forfeit']] },
            },
            startedAt: { type: DataTypes.DATE, allowNull: true },
            finishedAt: { type: DataTypes.DATE, allowNull: true },
        },
        {
            tableName: 'games',
            timestamps: true, //it could change to automatize the CreatedAt and UpdatedAt
            createdAt: 'createdAt',
            updatedAt: false,
            indexes: [{ fields: ['state'] }],
            validate: {
                coherentConnectFourState() {
                    validateBoard(this.board);
                    if (this.state === 'finished') {
                        if (!this.finishReason || !this.finishedAt || this.currentPlayerId != null) {
                            throw new Error('A finished Connect Four game requires a reason, end time and no current player');
                        }
                        if ((this.finishReason === 'draw') !== (this.winnerId == null)) {
                            throw new Error('A draw has no winner; a win or forfeit requires a winner');
                        }
                    } else if (this.winnerId != null || this.finishReason != null || this.finishedAt != null) {
                        throw new Error('An unfinished Connect Four game cannot have a result');
                    }
                },
            },
        }
    );

    Game.associate = (models) => {
        Game.belongsTo(models.User, { foreignKey: 'creatorId', as: 'creator' });
        Game.belongsTo(models.User, { foreignKey: 'currentPlayerId', as: 'currentPlayer' });
        Game.belongsTo(models.User, { foreignKey: 'winnerId', as: 'winner', onDelete: 'RESTRICT' });
        Game.hasMany(models.Invitation, { foreignKey: 'gameId', as: 'invitations' });
        Game.hasMany(models.Score, { foreignKey: 'gameId' });
        Game.hasMany(models.GamePlayer, { foreignKey: 'gameId' });
        Game.belongsToMany(models.User, {
            through: models.GamePlayer,
            foreignKey: 'gameId',
            otherKey: 'userId',
            as: 'players',
        });
        Game.hasMany(models.History, {foreignKey: 'gameId'});
    };

    return Game;

};

export default gameModel;
