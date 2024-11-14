CREATE TABLE sensor (
    id VARCHAR(50) PRIMARY KEY,
    lat FLOAT,
    lon FLOAT
);

CREATE TABLE entry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_value FLOAT,
    entry_type VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sensor_id VARCHAR(50),
    FOREIGN KEY (sensor_id) REFERENCES sensor(id)
);