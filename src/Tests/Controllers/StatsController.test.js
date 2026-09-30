import request from 'supertest';
import app from '../../app.js';
import { statsApiService } from '../../container.js';

jest.mock('../../container.js', () => ({
    statsApiService: {
        getRequestStats: jest.fn(),
        getResponseTimeStats: jest.fn(),
        getStatusCodeStats: jest.fn(),
        getPopularEndpointsStats: jest.fn(),
    },
}));

// Keep the real routes and middleware without writing tracking logs to a database.
jest.mock('../../Data Access/Repositories/ApiStatsRepository.js', () => ({
    __esModule: true,
    default: { create: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../../Helpers/logger.js', () => ({
    __esModule: true,
    default: { error: jest.fn(), warn: jest.fn() },
}));

describe('Stats routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.values(statsApiService).forEach((method) => method.mockReset());
    });

    describe.each([
        {
            path: '/api/stats/requests',
            method: 'getRequestStats',
            stats: { total_request: 3, breakdown: { '/api/games': { GET: 2, POST: 1 } } },
            emptyStats: { total_request: 0, breakdown: {} },
        },
        {
            path: '/api/stats/response-times',
            method: 'getResponseTimeStats',
            stats: { '/api/games': { avg: 20, min: 10, max: 30 } },
            emptyStats: {},
        },
        {
            path: '/api/stats/status-codes',
            method: 'getStatusCodeStats',
            stats: { 200: 5, 201: 2, 404: 1, 500: 1 },
            emptyStats: {},
        },
        {
            path: '/api/stats/popular-endpoints',
            method: 'getPopularEndpointsStats',
            stats: { most_popular: '/api/games', request_count: 7 },
            emptyStats: { most_popular: null, request_count: 0 },
        },
    ])('GET $path', ({ path, method, stats, emptyStats }) => {
        test('200 returns the service statistics as JSON', async () => {
            statsApiService[method].mockResolvedValue(stats);

            const response = await request(app).get(path);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.body).toEqual(stats);
            expect(statsApiService[method]).toHaveBeenCalledTimes(1);
            expect(statsApiService[method]).toHaveBeenCalledWith();
            Object.entries(statsApiService).forEach(([name, mock]) => {
                if (name !== method) expect(mock).not.toHaveBeenCalled();
            });
        });

        test('200 returns empty statistics when there are no logs', async () => {
            statsApiService[method].mockResolvedValue(emptyStats);

            const response = await request(app).get(path);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(emptyStats);
        });

        test('500 forwards service failures to the error handler', async () => {
            statsApiService[method].mockRejectedValue(new Error('Unable to load statistics'));

            const response = await request(app).get(path);

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Unable to load statistics' });
            expect(statsApiService[method]).toHaveBeenCalledTimes(1);
        });
    });
});
