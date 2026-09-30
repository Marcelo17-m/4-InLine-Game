export const createStatsService = ({apiStatsRepository, _}) => {
    const getRequestStats = async ()=>{
        const logs = await apiStatsRepository.findAll();
        const total_request = logs.length;

        const breakdown = logs.reduce((acc, log)=> {
            acc[log.endpointAccess] ??= {};
            acc[log.endpointAccess][log.requestMethod] = (acc[log.endpointAccess]
                [log.requestMethod] ?? 0) + 1;
                return acc;
        }, {});
        return {total_request, breakdown};
    };

    const getResponseTimeStats = async ()=>{
        const logs = await apiStatsRepository.findAll();
        const grouped = _.groupBy(logs, (log) => log.endpointAccess);

        return Object.fromEntries(
            Object.entries(grouped).map(([endpoint, entries]) => {
                const times = entries.map((entry)=> entry.responseTime);
                const avg = Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
                return [endpoint, {avg, min: Math.min(...times), max: Math.max(...times)}];
            })
        );
    };

    const getStatusCodeStats = async()=>{
        const logs = await apiStatsRepository.findAll();

        return logs.reduce((acc, log) => {
            acc[log.statusCode] = (acc[log.statusCode]?? 0) + 1;
            return acc;
        }, {});
    };

    const getPopularEndpointsStats = async()=>{
        const logs = await apiStatsRepository.findAll();

        //if there are no logs there is no popular to return
        if (logs.length === 0) return {most_popular: null, request_count:0};

        const grouped = _.groupBy(logs, (log) => log.endpointAccess);

        const [most_popular, request_count] = Object.entries(grouped)
            .map(([endpoint, entries]) => [endpoint, entries.length])
            .reduce((best, current)=> (current[1] > best[1] ? current: best));

        return {most_popular, request_count};
    }

    return { 
        getRequestStats, 
        getResponseTimeStats, 
        getStatusCodeStats, 
        getPopularEndpointsStats 
    };
}