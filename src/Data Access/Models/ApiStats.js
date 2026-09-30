const apiStatsModel = (sequelize, DataTypes) => {
    const ApiStats = sequelize.define(
        'ApiStats',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            endpointAccess: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            requestMethod: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            statusCode: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            responseTime: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
        },
        {
            tableName: 'api_stats_logs',
            timestamps: true,
            createdAt: 'createdAt',
            updatedAt: false,
        }
    );

    // No associations needed on purpose
    return ApiStats;
};

export default apiStatsModel;