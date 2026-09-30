import Result from '../Logic/Monads/result.js';

// Encadena validadores async en uno solo, como un pipe: cada uno recibe
// data, valida, y devuelve un Result. Si alguno da Err, ahí mismo se
// corta. Si da Ok, seguimos con el siguiente validador.
export const composeAsyncValidators =
    //Recibe una lista de funciones validadoras.
    (...validators) =>
        //Devuelve una nueva funcion que recibe la data inicial.
        (data) =>
            //reduce iterara sobre cada validador, acumulando el resultado.
            validators.reduce(
                //El callback es async porque los validadores consultan la BD.
                async (accPromise, validator) => {
                    //Esperamos a que se resuelva la validacion anterior.
                    // acc sera un objeto Result (Ok o Err).
                    const acc = await accPromise;
                    //este if evita ejecutar un validador mas si ya hay uno con error
                    //previo
                    if (acc.isErr()) return acc;

                    //si llegamos aca el anterior validador fue ok
                    //y ejecutamos la nueva validacion pasando el valor
                    //acumulado
                    const res = await validator(acc.value);

                    //como ya todos los validadores devuelven un Result
                    //res entonces es result.
                    // chain espera una función que devuelva un Result, por eso 
                    // pasamos () => res. Si por alguna razón extraña acc fuera 
                    // Err aqui, chain lo ignoraría.
                    return acc.chain(() => res);
                },
                //envolvemos la data original en una promesa que contiene un Result.ok
                Promise.resolve(Result.Ok(data))
            );