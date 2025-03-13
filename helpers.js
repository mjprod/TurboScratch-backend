const decreaseUserCardBalance = (pool, res, user_id) => {
  const updateUserScoreQuery = `
    UPDATE Users
    SET card_balance = card_balance - 1
    WHERE user_id = ?;
  `;
  pool.query(updateUserScoreQuery, [user_id], (err, result) => {
    if (err) {
      console.error("Error Updating User data:", err);
      return res.status(500).json({ error: err.message });
    }
    return res.status(200).json({
      message: "Successfully Decreased the Card Balance",
      user_id: user_id,
    });
  });
};

module.exports = {
  decreaseUserCardBalance,
};
