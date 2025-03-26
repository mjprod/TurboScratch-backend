SELECT * FROM Users;
SELECT * FROM Leaderboard;

CREATE TABLE Leaderboard (
    leaderboard_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    week_start_date DATE NOT NULL,
    score INT NOT NULL,
    current_rank INT NOT NULL,
    previous_rank INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

drop table LeaderBoard;

INSERT INTO Leaderboard (user_id, week_start_date, score, current_rank, previous_rank)
SELECT 
    user.user_id,
    CURDATE() AS week_start_date,
    user.total_score,
    RANK() OVER (ORDER BY user.total_score DESC) AS current_rank,
    (SELECT current_rank 
     FROM Leaderboard 
     WHERE user_id = user.user_id 
       AND week_start_date = DATE_SUB(CURDATE(), INTERVAL 7 DAY)
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

select 1;

SELECT l.user_id,
   u.name,
   l.week_start_date,
   u.total_score,
   l.current_rank,
   l.previous_rank,
   CASE 
	   WHEN l.previous_rank IS NULL THEN 'N/A'
	   WHEN l.current_rank < l.previous_rank THEN 'up'
	   WHEN l.current_rank > l.previous_rank THEN 'down'
	   ELSE 'same'
   END AS trend
FROM Leaderboard l
JOIN Users u ON l.user_id = u.user_id
LIMIT 5 OFFSET 0;

CREATE TABLE turbo_scratch.Winners (
    winner_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    beta_block_id INT,
    week_number INT,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT fk_beta_block FOREIGN KEY (beta_block_id) REFERENCES BetaBlock(beta_block_id)
);

WITH computed_ranks AS (
  SELECT 
    user_id,
    name,
    total_score,
    RANK() OVER (ORDER BY total_score DESC) AS computed_rank
  FROM Users
)
SELECT 
  l.user_id,
  cr.name,
  l.week_start_date,
  cr.total_score,
  cr.computed_rank AS current_rank,
  l.current_rank AS snapshot_rank,
  CASE
	WHEN l.current_rank IS NULL THEN 'N/A'
    WHEN cr.computed_rank < l.current_rank THEN 'up'
    WHEN cr.computed_rank > l.current_rank THEN 'down'
    ELSE 'same'
  END AS trend
FROM Leaderboard l
JOIN computed_ranks cr ON l.user_id = cr.user_id
ORDER BY cr.computed_rank
LIMIT 10 OFFSET 0;