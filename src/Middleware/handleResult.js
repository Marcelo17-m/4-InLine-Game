export const handleResult = (res, result, successStatus = 200) => {
    if (result.isErr()) {
        return res
            .status(result.error.statusCode ?? 400)
            .json({ error: result.error.message });
    }
    return res.status(successStatus).json(result.value);
};