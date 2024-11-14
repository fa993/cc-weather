import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import './Overlay.css';
import { Chart, registerables } from 'chart.js';
import { API } from './utils';

Chart.register(...registerables);

function millisecondsToStr(milliseconds) {
	// TIP: to find current time in milliseconds, use:
	// var  current_time_milliseconds = new Date().getTime();

	function numberEnding(number) {
		return number > 1 ? 's' : '';
	}

	var temp = Math.floor(milliseconds / 1000);
	var years = Math.floor(temp / 31536000);
	if (years) {
		return years + ' year' + numberEnding(years);
	}
	//TODO: Months! Maybe weeks?
	var days = Math.floor((temp %= 31536000) / 86400);
	if (days) {
		return days + ' day' + numberEnding(days);
	}
	var hours = Math.floor((temp %= 86400) / 3600);
	if (hours) {
		return hours + ' hour' + numberEnding(hours);
	}
	var minutes = Math.floor((temp %= 3600) / 60);
	if (minutes) {
		return minutes + ' minute' + numberEnding(minutes);
	}
	var seconds = temp % 60;
	if (seconds) {
		return seconds + ' second' + numberEnding(seconds);
	}
	return 'less than a second'; //'just now' //or other string you like;
}

const Overlay = ({ sensor, onClose }) => {
	const [curT, setcurT] = useState('-');
	const [curH, setcurH] = useState('-');

	const [daily, setdaily] = useState([]);
	useEffect(() => {
		async function doStuff() {
			if (!sensor?.id) {
				return;
			}
			const response = await fetch(
				`${API}/api/stats?sensorId=${sensor.id}&days=6`
			);
			if (response.ok) {
				const dat = await response.json();
				setdaily(dat);
			}
		}
		doStuff();
	}, [sensor]);

	const [eightHoursTemp, seteightHoursTemp] = useState([]);

	useEffect(() => {
		async function doStuff() {
			if (!sensor?.id) {
				return;
			}
			const response = await fetch(
				`${API}/api/entries?sensorId=${
					sensor.id
				}&length=500&entry_type=temperature&from=${new Date(
					new Date().getTime() - 8 * 60 * 60 * 1000
				).toISOString()}`
			);
			if (response.ok) {
				const dat = await response.json();
				seteightHoursTemp(dat);
				console.log(dat.length);
				setcurT(dat?.[0].entry_value);
			}
		}
		doStuff();
	}, [sensor]);

	const [eightHoursHum, seteightHoursHum] = useState([]);

	useEffect(() => {
		async function doStuff() {
			if (!sensor?.id) {
				return;
			}
			const response = await fetch(
				`${API}/api/entries?sensorId=${
					sensor.id
				}&length=500&entry_type=humidity&from=${new Date(
					new Date().getTime() - 8 * 60 * 60 * 1000
				).toISOString()}`
			);
			if (response.ok) {
				const dat = await response.json();
				seteightHoursHum(dat);
				setcurH(dat?.[0].entry_value);
			}
		}
		doStuff();
	}, [sensor]);

	const chartData = {
		labels: eightHoursTemp.map((e) => {
			const date = new Date(e.timestamp);
			return (
				date.getHours().toString().padStart(2, '0') +
				':' +
				date.getMinutes().toString().padStart(2, '0')
			);
		}),
		datasets: [
			{
				label: 'Temperature (°C)',
				data: eightHoursTemp.map((e) => e.entry_value),
				borderColor: '#ffa726',
				backgroundColor: 'rgba(255, 167, 38, 0.2)',
				fill: true,
				yAxisID: 'y',
			},
			{
				label: 'Humidity (%)',
				data: eightHoursHum.map((e) => e.entry_value),
				borderColor: '#66bb6a',
				backgroundColor: 'rgba(102, 187, 106, 0.2)',
				fill: true,
				yAxisID: 'y1',
			},
		],
	};

	const chartOptions = {
		responsive: true,
		interaction: {
			intersect: false,
		},
		scales: {
			y: {
				type: 'linear',
				position: 'left',
				display: true,
			},
			y1: {
				type: 'linear',
				position: 'right',
				display: true,
				grid: {
					drawOnChartArea: false, // only want the grid lines for one axis to show up
				},
			},
		},
	};

	return (
		<div className='weather-overlay'>
			<button className='close-button' onClick={onClose}>
				×
			</button>
			<div className='current-weather'>
				<h2>Current Weather</h2>
				<p>Temperature: {curT}°C</p>
				<p>Humidity: {curH}%</p>
				<p>
					As of{' '}
					{millisecondsToStr(
						new Date().getTime() -
							new Date(eightHoursTemp?.[0]?.timestamp).getTime()
					)}{' '}
					ago
				</p>
			</div>
			<div className='five-day-summary'>
				<h2>6 days History</h2>
				<div className='day-boxes'>
					{daily
						.map((day, index) => (
							<div key={index} className='day-box'>
								<p className='day-name'>
									{new Date(day.day).toLocaleString('en-US', {
										weekday: 'short',
									})}
								</p>
								<p>
									{Number(day.maxTemperature).toFixed(2)}°C/
									{Number(day.minTemperature).toFixed(2)}°C
								</p>
								<p>{Number(day.avgHumidity).toFixed(2)}%</p>
							</div>
						))
						.slice(0, 6)}
				</div>
			</div>
			<div className='hourly-chart'>
				<h2>Last 8 Hours</h2>
				<Line data={chartData} options={chartOptions} />
			</div>
		</div>
	);
};

export default Overlay;
