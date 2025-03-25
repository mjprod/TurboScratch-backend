const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../configs/jwt");

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Token format is invalid" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: "Failed to authenticate token" });
        }
        req.user = decoded;
        next();
    });
}

module.exports = authMiddleware;