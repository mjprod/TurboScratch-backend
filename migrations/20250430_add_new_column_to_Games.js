module.exports = {
  up: async (db) => {
    await db.query(`
          ALTER TABLE Games
          ADD COLUMN week INT DEFAULT 0;
        `);
  },
  down: async (db) => {
    await db.query(`
          ALTER TABLE Games
          DROP COLUMN week;
        `);
  }
};