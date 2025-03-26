const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const router = express.Router();
const { JWT_SECRET, TOKEN_EXPIRES, REFRESH_TOKEN_EXPIRES } = require("../configs/jwt");

router.use(cookieParser());

let refreshTokensStore = [];

function generateAccessToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
}

function generateRefreshToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
}

router.post("/", (req, res) => {
  const { user_id, name, email } = req.body;
  if (!user_id || !name || !email) {
    return res.status(400).json({ error: "user_id, name e email são obrigatórios" });
  }

  const user = { user_id, name, email };
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  refreshTokensStore.push(refreshToken);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });

  res.json({ accessToken, refreshToken });
});

router.post("/token", (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  if (!refreshTokensStore.includes(refreshToken)) return res.sendStatus(403);

  jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    refreshTokensStore = refreshTokensStore.filter(token => token !== refreshToken);

    const newAccessToken = generateAccessToken({ user_id: user.user_id, name: user.name, email: user.email });
    const newRefreshToken = generateRefreshToken({ user_id: user.user_id, name: user.name, email: user.email });

    refreshTokensStore.push(newRefreshToken);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      //maxAge: REFRESH_TOKEN_EXPIRES * 1000
    });

    res.json({ accessToken: newAccessToken });
  });
});

router.post("/logout", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  refreshTokensStore = refreshTokensStore.filter(token => token !== refreshToken);

  res.clearCookie("refreshToken");

  res.sendStatus(204);
});

router.post("/logoutAll", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(400);

  jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    refreshTokensStore = refreshTokensStore.filter(token => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.user_id !== user.user_id;
      } catch (e) {
        return false;
      }
    });
    res.clearCookie("refreshToken");

    res.sendStatus(204);
  });
});

module.exports = router;