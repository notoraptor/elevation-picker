import React from 'react';
import ReactDOM from "react-dom";

export function addGoogleMapElevationControl(google, map, onClick) {
	const elevationControl = document.createElement('div');
	elevationControl.title = 'Download elevation';
	elevationControl.classList.add('google-map-geolocation-button');
	elevationControl.classList.add('google-map-elevation-button');
	elevationControl.index = 1;
	elevationControl.addEventListener('click', onClick);
	// Mylocation icon reference: (2019/09/04) https://www.materialui.co/icon/my-location
	// Mylocation icon reference: (2019/09/17) https://www.materialui.co/icon/terrain
	ReactDOM.render((
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z"/></svg>
	), elevationControl);
	map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(elevationControl);
}
