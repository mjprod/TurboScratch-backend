const crypto = require("../utils/crypto");

function cryptoMiddleware(req, res, next) {
    if (req.body && req.body.data) {
        const decryptedData = crypto.decrypt(req.body.data);
        if (!decryptedData) {
            return res.status(400).json({ error: "Invalid or corrupted encrypted data" });
        }
        req.body.data = decryptedData;
    }

    const originalJson = res.json;
    res.json = function(data) {
        const encryptedData = crypto.encrypt(data);
        return originalJson.call(this,  encryptedData );
    };

    next();
}

module.exports = cryptoMiddleware;