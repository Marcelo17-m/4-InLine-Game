import _ from 'lodash';
import { createStatsService } from '../../Logic/Services/StatsService.js';

describe('StatsService Unit Tests', () => {
    let apiStatsRepository, statsService;

    beforeEach(() => {
        apiStatsRepository = { findAll: jest.fn() };
        statsService = createStatsService({ apiStatsRepository, _ });
    });

    describe('getRequestStats', () => {
        test('counts requests by endpoint and HTTP method', async () => {
            apiStatsRepository.findAll.mockResolvedValue([
                { endpointAccess: '/api/games', requestMethod: 'GET' },
                { endpointAccess: '/api/games', requestMethod: 'POST' },
                { endpointAccess: '/api/scores', requestMethod: 'GET' },
                { endpointAccess: '/api/games', requestMethod: 'GET' },
            ]);

            const result = await statsService.getRequestStats();

            expect(result).toEqual({
                total_request: 4,
                breakdown: {
                    '/api/games': { GET: 2, POST: 1 },
                    '/api/scores': { GET: 1 },
                },
            });
            expect(apiStatsRepository.findAll).toHaveBeenCalledTimes(1);
            expect(apiStatsRepository.findAll).toHaveBeenCalledWith();
        });

        test('returns zero requests and an empty breakdown without logs', async () => {
            apiStatsRepository.findAll.mockResolvedValue([]);

            expect(await statsService.getRequestStats()).toEqual({
                total_request: 0, breakdown: {},
            });
        });
    });

    describe('getResponseTimeStats', () => {
        test('calculates rounded averages, minimums and maximums for each endpoint', async () => {
            apiStatsRepository.findAll.mockResolvedValue([
                { endpointAccess: '/api/games', responseTime: 10, requestMethod: 'GET' },
                { endpointAccess: '/api/scores', responseTime: 0 },
                { endpointAccess: '/api/games', responseTime: 11, requestMethod: 'POST' },
                { endpointAccess: '/api/scores', responseTime: 5 },
                { endpointAccess: '/api/games', responseTime: 14, requestMethod: 'GET' },
                { endpointAccess: '/api/scores', responseTime: 5 },
            ]);

            expect(await statsService.getResponseTimeStats()).toEqual({
                '/api/games': { avg: 12, min: 10, max: 14 },
                '/api/scores': { avg: 3, min: 0, max: 5 },
            });
            expect(apiStatsRepository.findAll).toHaveBeenCalledTimes(1);
        });

        test('uses the same response time for all metrics with a single request', async () => {
            apiStatsRepository.findAll.mockResolvedValue([
                { endpointAccess: '/api/games', responseTime: 25 },
            ]);

            expect(await statsService.getResponseTimeStats()).toEqual({
                '/api/games': { avg: 25, min: 25, max: 25 },
            });
        });

        test('returns an empty object without logs', async () => {
            apiStatsRepository.findAll.mockResolvedValue([]);

            expect(await statsService.getResponseTimeStats()).toEqual({});
        });
    });

    describe('getStatusCodeStats', () => {
        test('counts status codes across endpoints and request methods', async () => {
            apiStatsRepository.findAll.mockResolvedValue([
                { endpointAccess: '/api/games', requestMethod: 'GET', statusCode: 200 },
                { endpointAccess: '/api/scores', requestMethod: 'GET', statusCode: 200 },
                { endpointAccess: '/api/games', requestMethod: 'POST', statusCode: 201 },
                { endpointAccess: '/api/games/99', requestMethod: 'GET', statusCode: 404 },
                { endpointAccess: '/api/scores', requestMethod: 'POST', statusCode: 500 },
            ]);

            expect(await statsService.getStatusCodeStats()).toEqual({
                200: 2, 201: 1, 404: 1, 500: 1,
            });
            expect(apiStatsRepository.findAll).toHaveBeenCalledTimes(1);
        });

        test('returns an empty object without logs', async () => {
            apiStatsRepository.findAll.mockResolvedValue([]);

            expect(await statsService.getStatusCodeStats()).toEqual({});
        });
    });

    describe('getPopularEndpointsStats', () => {
        test('selects the most requested endpoint across HTTP methods', async () => {
            apiStatsRepository.findAll.mockResolvedValue([
                { endpointAccess: '/api/scores', requestMethod: 'GET' },
                { endpointAccess: '/api/games', requestMethod: 'GET' },
                { endpointAccess: '/api/cards', requestMethod: 'GET' },
                { endpointAccess: '/api/games', requestMethod: 'POST' },
            ]);

            expect(await statsService.getPopularEndpointsStats()).toEqual({
                most_popular: '/api/games', request_count: 2,
            });
            expect(apiStatsRepository.findAll).toHaveBeenCalledTimes(1);
        });

        test('keeps the first encountered endpoint when counts are tied', async () => {
            apiStatsRepository.findAll.mockResolvedValue([
                { endpointAccess: '/api/scores' },
                { endpointAccess: '/api/games' },
                { endpointAccess: '/api/games' },
                { endpointAccess: '/api/scores' },
            ]);

            expect(await statsService.getPopularEndpointsStats()).toEqual({
                most_popular: '/api/scores', request_count: 2,
            });
        });

        test('returns the only endpoint for a single request', async () => {
            apiStatsRepository.findAll.mockResolvedValue([{ endpointAccess: '/api/games' }]);

            expect(await statsService.getPopularEndpointsStats()).toEqual({
                most_popular: '/api/games', request_count: 1,
            });
        });

        test('returns no popular endpoint without logs', async () => {
            apiStatsRepository.findAll.mockResolvedValue([]);

            expect(await statsService.getPopularEndpointsStats()).toEqual({
                most_popular: null, request_count: 0,
            });
        });
    });

    test.each([
        'getRequestStats', 'getResponseTimeStats',
        'getStatusCodeStats', 'getPopularEndpointsStats',
    ])('%s propagates repository failures', async (method) => {
        const error = new Error('Unable to load request logs');
        apiStatsRepository.findAll.mockRejectedValue(error);

        await expect(statsService[method]()).rejects.toBe(error);
    });
});
