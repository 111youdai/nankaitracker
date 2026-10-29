CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS baselines(group_name TEXT NOT NULL,diagram TEXT NOT NULL,revision TEXT NOT NULL,fetched_at TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(group_name,diagram,revision));
CREATE TABLE IF NOT EXISTS pending(id INTEGER PRIMARY KEY,group_name TEXT NOT NULL,source_time TEXT NOT NULL,service_date TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(group_name,source_time));
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,service_date TEXT NOT NULL,group_name TEXT NOT NULL,train_key TEXT NOT NULL,train_number TEXT NOT NULL,first_seen TEXT NOT NULL,last_seen TEXT NOT NULL,formation TEXT NOT NULL,baseline TEXT NOT NULL,last_payload TEXT NOT NULL,UNIQUE(service_date,group_name,train_key));
CREATE TABLE IF NOT EXISTS observations(id INTEGER PRIMARY KEY,event_id INTEGER NOT NULL REFERENCES events(id),source_time TEXT NOT NULL,observed_at TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(event_id,source_time,payload));
CREATE INDEX IF NOT EXISTS event_day ON events(service_date,group_name,id);
CREATE INDEX IF NOT EXISTS observation_event ON observations(event_id,id);
CREATE INDEX IF NOT EXISTS pending_time ON pending(source_time,id);
