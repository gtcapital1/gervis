-- Tabella per il tracciamento delle attività completate
CREATE TABLE completed_tasks (
  id SERIAL PRIMARY KEY,
  advisor_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indici per migliorare le prestazioni delle query
CREATE INDEX idx_completed_tasks_advisor ON completed_tasks(advisor_id);
CREATE INDEX idx_completed_tasks_task ON completed_tasks(task_id);
CREATE INDEX idx_completed_tasks_date ON completed_tasks(completed_at); 