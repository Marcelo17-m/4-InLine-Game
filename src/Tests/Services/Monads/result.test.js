import Result from '../../../Logic/Monads/result.js';

describe('Result', () => {
    describe('Result.Ok', () => {
        test('isOk() is true and isErr() is false', () => {
            const result = Result.Ok(42);
            expect(result.isOk()).toBe(true);
            expect(result.isErr()).toBe(false);
        });

        test('exposes the value and a null error', () => {
            const result = Result.Ok(42);
            expect(result.value).toBe(42);
            expect(result.error).toBeNull();
        });

        describe('map', () => {
            test('applies the function and wraps the result in Ok', () => {
                const result = Result.Ok(2).map((n) => n * 10);
                expect(result.isOk()).toBe(true);
                expect(result.value).toBe(20);
            });
        });

        describe('mapErr', () => {
            test('Ok keeps the original value', () => {
                const result = Result.Ok(2).mapErr((e) => `wrapped: ${e}`);
                expect(result.isOk()).toBe(true);
                expect(result.value).toBe(2);
            });
        });
    });

    describe('Result.Err', () => {
        test('isErr() is true and isOk() is false', () => {
            const result = Result.Err('boom');
            expect(result.isOk()).toBe(false);
            expect(result.isErr()).toBe(true);
        });

        test('exposes the error and a null value', () => {
            const result = Result.Err('boom');
            expect(result.error).toBe('boom');
            expect(result.value).toBeNull();
        });

        describe('map', () => {
            test('keeps the original error', () => {
                const result = Result.Err('boom').map((n) => n * 10);
                expect(result.isErr()).toBe(true);
                expect(result.error).toBe('boom');
            });
        });

        describe('mapErr', () => {
            test('applies the function to the error and wraps it in Err', () => {
                const result = Result.Err('boom').mapErr((e) => `wrapped: ${e}`);
                expect(result.isErr()).toBe(true);
                expect(result.error).toBe('wrapped: boom');
            });
        });
    });
});