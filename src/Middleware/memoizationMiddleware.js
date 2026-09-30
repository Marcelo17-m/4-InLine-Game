// Uso:const cache=createMemoizationMiddleware({ max: 50, maxAge: 30000 });
//router.get('/algo', authMiddleware, cache, controller.algo);
export const createMemoizationMiddleware = ({max = 50, maxAge = 30000} = {})=>{
    // cada entrada: {key, statusCode, body, lastAccessedAt, expiresAt}
    let cacheEntries = [];

    const now = ()=> Date.now();

    //Crea una firma unica para cada peticion combinando metodo HTTP, URL, 
    // el cuerpo de la peticion (body) y el ID del usuario 
    // (req.user.id). Esto evita que un usuario reciba datos en cache pertenecientes a otro.
    const buildCacheKey = (req)=> {
        const bodyPart = req.method === 'GET' ? '' : `:${JSON.stringify(req.body ?? {})}`;
        const userPart = req.user?.id ? `:user${req.user.id}` : '';
        return `${req.method}:${req.originalUrl}${bodyPart}${userPart}`;
    };

    const findEntry = (key) => cacheEntries.find((entry) => entry.key === key);

    // acumulador: cuenta cuantas entradas hay actualmente en cache
    const countEntries = () => cacheEntries.reduce((total) => total + 1, 0);

    // filter:saca del arreglo cualquier entrada ya vencida segun su propio expiresAt
    // se ejecuta en cada request cacheable, asi la "verificacion regular" ocurre
    // sola con el trafico normal, sin necesitar un timer aparte
    const removeExpiredEntries = () => {
        cacheEntries = cacheEntries.filter((entry) => entry.expiresAt > now());
    };

    //reduce para identificar la entrada menos recientemente usada y filter para eliminarla
    const evictLeastRecentlyUsedIfNeeded = () => {
        if (countEntries() < max) return;

        const leastRecentlyUsed = cacheEntries.reduce((oldest, entry) =>
            entry.lastAccessedAt < oldest.lastAccessedAt ? entry : oldest
        );

        cacheEntries = cacheEntries.filter((entry) => entry.key !== leastRecentlyUsed.key);
    };

    //cada acceso se reinicia el ultimo uso como la expiracion
    const touchEntry = (entry) => {
        entry.lastAccessedAt = now();
        entry.expiresAt = now() + maxAge;
    };

    const memoizationMiddleware = (req, res, next) => {
        removeExpiredEntries();

        const key = buildCacheKey(req);
        const cached = findEntry(key);

        if(cached){
            touchEntry(cached);
            return res.status(cached.statusCode).json(cached.body);
        }

        //we intercept the json to capture the controller r esponse
        //without the controller knowing we did it
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode < 400) {
                evictLeastRecentlyUsedIfNeeded();
                cacheEntries.push({
                    key,
                    statusCode: res.statusCode,
                    body,
                    lastAccessedAt: now(),
                    expiresAt: now() + maxAge,
                });
            }
            return originalJson(body);
        };

        next();
    };

    //extra utilities to tests o manually do stuff like clean everything
    memoizationMiddleware.invalidate = (predicate) => {
        cacheEntries = cacheEntries.filter((entry) => !predicate(entry.key));
    };    
    memoizationMiddleware.clear = () => { cacheEntries = []; };
    memoizationMiddleware.size = () => countEntries();

    return memoizationMiddleware;
};

export default createMemoizationMiddleware;