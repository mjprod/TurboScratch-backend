const API_KEY = process.env.API_KEY;

function apiKeyMiddleware(req, res, next) {
    const apiKey = req.header('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    next();
}

module.exports = apiKeyMiddleware;