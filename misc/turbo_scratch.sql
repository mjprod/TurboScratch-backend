CREATE TABLE Leaderboard (
    leaderboard_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    week_start_date DATE NOT NULL,
    score INT NOT NULL,
    current_rank INT NOT NULL,
    previous_rank INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (user_id, week_start_date),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

INSERT INTO Leaderboard (user_id, week_start_date, score, current_rank, previous_rank)
SELECT 
    user.user_id,
    '2025-03-16' AS week_start_date,
    user.scoretotal_score,
    RANK() OVER (ORDER BY user.scoretotal_score DESC) AS current_rank,
    (SELECT current_rank 
     FROM Leaderboard 
     WHERE user_id = user.user_id 
       AND week_start_date = DATE_SUB('2025-03-16', INTERVAL 7 DAY)
    ) AS previous_rank
FROM Users user;

SELECT user_id,
       week_start_date,
       score,
       current_rank,
       previous_rank,
       CASE 
           WHEN previous_rank IS NULL THEN 'N/A'
           WHEN current_rank < previous_rank THEN 'up'
           WHEN current_rank > previous_rank THEN 'down'
           ELSE 'same'
       END AS trend
FROM Leaderboard;

select * from BetaBlock;