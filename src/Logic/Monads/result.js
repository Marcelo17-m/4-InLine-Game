// Result monad: envuelve un valor que salió bien o mal para manejar las
// excepciones y que los services devuelvan el resultado sin lanzar
// excepciones molestas para el programa.
const Result = {
    Ok: (value) => ({
        // map envuelve el resultado de la funcion en OTRA caja Ok
        map: (fn) => Result.Ok(fn(value)),
        mapErr: () => Result.Ok(value),
        // chain asume que la función fn ya devuelve una caja Result
        // y simplemente ejecuta la funcion y devuelve su caja original
        chain: (fn) => fn(value),
        value,
        error: null,
        isOk: () => true,
        isErr: () => false,
    }),
    Err: (error) => ({
        map: () => Result.Err(error),
        mapErr: (fn) => Result.Err(fn(error)),
        // Si la caja ya es un Error, chain ignora la funcion que llegue
        // y simplemente devuelve el error original
        chain: () => Result.Err(error),
        value: null,
        error,
        isOk: () => false,
        isErr: () => true,
    }),
};

export default Result;