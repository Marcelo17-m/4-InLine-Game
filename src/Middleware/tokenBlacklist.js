const revokedTokens = new Set();

const revoke = (token) => {
    revokedTokens.add(token);
};

const isRevoked = (token) => {
    return revokedTokens.has(token);
};

export { revoke, isRevoked};