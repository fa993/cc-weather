require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mariadb = require('mariadb');
const bodyParser = require('body-parser');
var cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use(express.static('public'));

// Database connection pool
const pool = mariadb.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	port: process.env.DB_PORT || 3306,
	connectionLimit: 5,
});

// POST route to add an entry to the 'entry' table
app.post('/api/entry', async (req, res) => {
	const { entry_value, entry_type, sensor_id } = req.body;

	if (!entry_value || !entry_type || !sensor_id) {
		return res.status(400).json({
			error: 'Please provide entry_value, entry_type, and sensor_id.',
		});
	}

	let conn;
	try {
		conn = await pool.getConnection();
		const query =
			'INSERT INTO entry (entry_value, entry_type, sensor_id) VALUES (?, ?, ?)';
		const result = await conn.query(query, [
			entry_value,
			entry_type,
			sensor_id,
		]);

		res.status(201).json({
			message: 'Entry added successfully',
			entryId: Number(result.insertId),
		});
	} catch (err) {
		console.error('Error adding entry:', err);
		res.status(500).json({ error: 'Failed to add entry' });
	} finally {
		if (conn) conn.release(); // Release the connection back to the pool
	}
});

app.get('/api/sensors', async (req, res) => {
	let conn;
	try {
		conn = await pool.getConnection();
		const entries = await conn.query('SELECT id, lat, lon from sensor');
		res.status(200).json(entries);
	} catch (err) {
		console.error('Error fetching entries:', err);
		res.status(500).json({ error: 'Failed to retrieve entries' });
	} finally {
		if (conn) conn.release();
	}
});

// Route to get a range of entries with filters for offset, length, timestamp range, and entry_type
app.get('/api/entries', async (req, res) => {
	const { offset = 0, length = 10, from, to, entry_type } = req.query;

	// Validate offset and length
	const parsedOffset = parseInt(offset, 10);
	const parsedLength = parseInt(length, 10);

	if (isNaN(parsedOffset) || isNaN(parsedLength)) {
		return res
			.status(400)
			.json({ error: 'Offset and length must be valid numbers.' });
	}

	// Build the query with optional from, to, and entry_type filters
	let query = 'SELECT * FROM entry WHERE 1=1';
	const params = [];

	if (from) {
		query += ' AND timestamp >= ?';
		params.push(from);
	}

	if (to) {
		query += ' AND timestamp <= ?';
		params.push(to);
	}

	if (entry_type) {
		query += ' AND entry_type = ?';
		params.push(entry_type);
	}

	query += ' ORDER BY timestamp DESC LIMIT ?, ?';
	params.push(parsedOffset, parsedLength);

	let conn;
	try {
		conn = await pool.getConnection();
		const entries = await conn.query(query, params);
		res.status(200).json(entries);
	} catch (err) {
		console.error('Error fetching entries:', err);
		res.status(500).json({ error: 'Failed to retrieve entries' });
	} finally {
		if (conn) conn.release();
	}
});

app.get('/api/stats', async (req, res) => {
	let { days, sensorId } = req.query;

	// Validate input
	if (!days) {
		days = 5;
	}
	if (!days || isNaN(days) || days <= 0) {
		return res
			.status(400)
			.json({ error: 'Please provide a valid number of days' });
	}
	if (!sensorId) {
		sensorId = '72fe4140-a1ba-11ef-b0e1-0242ac110002';
		// return res.status(400).json({ error: 'Please provide a valid sensor ID' });
	}

	try {
		// Calculate the start date `n` days ago
		const dateFrom = new Date();
		dateFrom.setDate(dateFrom.getDate() - parseInt(days));
		const dateTo = new Date();

		// Query to get daily high, low temperatures and average humidity
		const rows = await pool.query(
			`
            SELECT 
                DATE(timestamp) AS day,
                MAX(CASE WHEN entry_type = 'temperature' THEN entry_value END) AS maxTemperature,
                MIN(CASE WHEN entry_type = 'temperature' THEN entry_value END) AS minTemperature,
                AVG(CASE WHEN entry_type = 'humidity' THEN entry_value END) AS avgHumidity
            FROM entry
            WHERE timestamp BETWEEN ? AND ?
            AND sensor_id = ?
            GROUP BY day
            ORDER BY day DESC
        `,
			[dateFrom, dateTo, sensorId]
		);

		// Respond with the calculated stats for each day
		res.json(rows);
	} catch (error) {
		console.error('Error fetching daily statistics:', error);
		res.status(500).json({ error: 'Failed to retrieve daily statistics' });
	}
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
