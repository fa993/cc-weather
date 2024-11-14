import './App.css';
import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import clouds from './clouds.png';
import Overlay from './Overlay';
import { API } from './utils';

function App() {
	const globeEl = useRef();

	const [selectedLabel, setselectedLabel] = useState(null);

	useEffect(() => {
		const globe = globeEl.current;

		// Auto-rotate
		globe.controls().autoRotate = true;
		globe.controls().autoRotateSpeed = 0.35;

		// Add clouds sphere
		const CLOUDS_IMG_URL = clouds; // from https://github.com/turban/webgl-earth
		const CLOUDS_ALT = 0.004;
		const CLOUDS_ROTATION_SPEED = -0.006; // deg/frame

		new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture) => {
			const clouds = new THREE.Mesh(
				new THREE.SphereGeometry(
					globe.getGlobeRadius() * (1 + CLOUDS_ALT),
					75,
					75
				),
				new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
			);
			globe.scene().add(clouds);

			(function rotateClouds() {
				clouds.rotation.y += (CLOUDS_ROTATION_SPEED * Math.PI) / 180;
				requestAnimationFrame(rotateClouds);
			})();
		});
	}, []);

	const [st, setSt] = useState([]);

	useEffect(() => {
		async function doStuff() {
			const response = await fetch(`${API}/api/sensors`);
			if (response.ok) {
				const con = await response.json();
				setSt(con);
			}
		}
		doStuff();
	}, []);

	return (
		<div>
			<div
				style={{
					position: 'fixed',
					zIndex: 50,
					width: '500px',
					display: selectedLabel ? 'block' : 'none',
				}}
			>
				<Overlay
					sensor={selectedLabel}
					onClose={(e) => {
						globeEl.current.controls().autoRotate = true;
						globeEl.current.pointOfView({ altitude: 2.5 }, 150);
						setselectedLabel(undefined);
					}}
				/>
			</div>
			<Globe
				ref={globeEl}
				animateIn={false}
				globeImageUrl='//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
				bumpImageUrl='//unpkg.com/three-globe/example/img/earth-topology.png'
				labelsData={st}
				labelLat={(d) => d.lat}
				labelLng={(d) => d.lon}
				labelAltitude={(_) => 0.006}
				labelColor={() => 'rgba(255, 165, 0, 0.75)'}
				labelResolution={30}
				labelText={(_) => ''}
				labelSize={(_) => 1}
				labelDotRadius={(_) => 1}
				onLabelClick={(lab, ev, cords) => {
					console.log(lab);
					console.log(ev);
					console.log(cords);
					setselectedLabel(lab);
					globeEl.current.controls().autoRotate = false;
					globeEl.current.pointOfView(
						{ lat: lab.lat, lng: lab.lon, altitude: 1 },
						150
					);
				}}
			/>
		</div>
	);
}

export default App;
