import { composeAsyncValidators } from '../../Helpers/composeAsyncValidators.js';
import Result from '../../Logic/Monads/result.js';

describe('composeAsyncValidators', () => {
    test('runs every validator in order and merges their Ok values into one accumulated object', async () => {
        const addA = async (data) => Result.Ok({ ...data, a: 1 });
        const addB = async (data) => Result.Ok({ ...data, b: data.a + 1 });

        const validate = composeAsyncValidators(addA, addB);
        const result = await validate({});

        expect(result.isOk()).toBe(true);
        expect(result.value).toEqual({ a: 1, b: 2 });
    });

    test('stops at the first Err and never runs the remaining validators', async () => {
        const ok = jest.fn(async () => Result.Ok({}));
        const fail = jest.fn(async () => Result.Err({statusCode: 400, message: 'invalid'}));
        const neverCalled = jest.fn(async () => Result.Ok({shouldNot: 'run'}));

        const validate = composeAsyncValidators(ok, fail, neverCalled);
        const result = await validate({});

        expect(result.isErr()).toBe(true);
        expect(result.error).toEqual({ statusCode: 400, message: 'invalid' });
        expect(neverCalled).not.toHaveBeenCalled();
    });

    test('each validator receives the data accumulated by the previous ones', async () => {
        const step1 = async (data) => Result.Ok({ ...data, step1: true });
        const step2 = async (data) => {
            expect(data.step1).toBe(true); // confirma que llegó lo que dejó step1
            return Result.Ok({ ...data, step2: true });
        };

        const validate = composeAsyncValidators(step1, step2);
        const result = await validate({ initial: 'value' });

        expect(result.value).toEqual({ initial: 'value', step1: true, step2: true });
    });
});