INSERT INTO sensor (id, lat, lon) VALUES
    ('72fe4140-a1ba-11ef-b0e1-0242ac110002', 12.972651, 79.164246),    -- Sensor 1
    ('72fe4422-a1ba-11ef-b0e1-0242ac110002', 19.218331, 72.978090);

-- Insert temperature and humidity entries into the entry table every 5 minutes from the last week to now

-- Set variables for start and end time
-- SET @start_time = NOW() - INTERVAL 1 WEEK;
-- SET @end_time = NOW();
-- SET @interval = INTERVAL 5 MINUTE;

-- Assume UUIDs of existing sensors (replace with actual UUIDs from the sensor table)
SET @sensor1_id = '72fe4140-a1ba-11ef-b0e1-0242ac110002'; -- Thane, Maharashtra
SET @sensor2_id = '72fe4422-a1ba-11ef-b0e1-0242ac110002'; -- Bangalore, India

-- Temporary variable for current time
-- SET @current_time = @start_time;

-- Function to calculate estimated temperature and humidity values based on time of day
DELIMITER //

CREATE FUNCTION getEstimatedValue(sensor VARCHAR(36), entry_type VARCHAR(20), time TIMESTAMP)
RETURNS FLOAT
BEGIN
    DECLARE hour INT;
    DECLARE value FLOAT;

    SET hour = HOUR(time);

    IF entry_type = 'temperature' THEN
        -- Temperature estimation: higher during the day, lower at night
        IF sensor = @sensor1_id THEN
            SET value = IF(hour BETWEEN 6 AND 18, 22 + (hour - 6) * 0.75, 34 - (24 - hour) * 0.5);
        ELSE
            SET value = IF(hour BETWEEN 6 AND 18, 18 + (hour - 6) * 0.5, 28 - (24 - hour) * 0.4);
        END IF;
    ELSE
        -- Humidity estimation: higher at night, lower during the day
        IF sensor = @sensor1_id THEN
            SET value = IF(hour BETWEEN 6 AND 18, 50 + (18 - hour) * 1.25, 85 - (hour - 18) * 0.75);
        ELSE
            SET value = IF(hour BETWEEN 6 AND 18, 40 + (18 - hour) * 1.2, 80 - (hour - 18) * 0.6);
        END IF;
    END IF;

    RETURN value;
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS populateEntries;

-- Create the stored procedure
DELIMITER //

CREATE PROCEDURE populateEntries()
BEGIN
    DECLARE currentTime TIMESTAMP;
    DECLARE endTime TIMESTAMP;

    -- Set initial values for currentTime and endTime
    SET currentTime = NOW() - INTERVAL 1 WEEK;
    SET endTime = NOW();

    -- Loop through each 5-minute interval
    WHILE currentTime <= endTime DO
        -- Insert temperature entry for Sensor 1 (Thane)
        INSERT INTO entry (entry_value, entry_type, timestamp, sensor_id)
        VALUES (getEstimatedValue(@sensor1_id, 'temperature', currentTime), 'temperature', currentTime, @sensor1_id);

        -- Insert humidity entry for Sensor 1 (Thane)
        INSERT INTO entry (entry_value, entry_type, timestamp, sensor_id)
        VALUES (getEstimatedValue(@sensor1_id, 'humidity', currentTime), 'humidity', currentTime, @sensor1_id);

        -- Insert temperature entry for Sensor 2 (Bangalore)
        INSERT INTO entry (entry_value, entry_type, timestamp, sensor_id)
        VALUES (getEstimatedValue(@sensor2_id, 'temperature', currentTime), 'temperature', currentTime, @sensor2_id);

        -- Insert humidity entry for Sensor 2 (Bangalore)
        INSERT INTO entry (entry_value, entry_type, timestamp, sensor_id)
        VALUES (getEstimatedValue(@sensor2_id, 'humidity', currentTime), 'humidity', currentTime, @sensor2_id);

        -- Move to the next 5-minute interval
        SET currentTime = currentTime + INTERVAL 5 MINUTE;
        SELECT currentTime;
    END WHILE;
END //

DELIMITER ;

-- Call the procedure to populate the entry table
CALL populateEntries();

-- Drop the function and procedure after use to clean up
DROP FUNCTION IF EXISTS getEstimatedValue;
DROP PROCEDURE IF EXISTS populateEntries;