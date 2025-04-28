ALTER TABLE Questions
DROP FOREIGN KEY fk_Question_Beta_Block;

ALTER TABLE Questions
ADD CONSTRAINT fk_Question_Beta_Block
FOREIGN KEY (beta_block_id) REFERENCES BetaBlocks(beta_block_id)
ON DELETE CASCADE;