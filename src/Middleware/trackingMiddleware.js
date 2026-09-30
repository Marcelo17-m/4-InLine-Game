import ApiStatsRepository from "../Data Access/Repositories/ApiStatsRepository.js";
import logger from "../Helpers/logger.js";

export const trackingMiddleware = (req, res, next) => {
    const startTime = Date.now();

    // 'finish' its fired when the express alredy send the answer to the client
    // it doesnt matter if the handler generate it.
    res.on("finish", () => {
        const responseTime = Date.now() - startTime;

        // Fire and forget: if the log fails it shouldnt affect the answer
        //that the client alredy got
        ApiStatsRepository.create({
            endpointAccess: req.originalUrl,
            requestMethod: req.method,
            statusCode: res.statusCode,
            responseTime,
            userId: req.user?.id ?? null,
        }).catch((err) => logger.error(err));
    });

    next();
};