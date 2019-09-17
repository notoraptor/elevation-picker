import React from 'react';
import PropTypes from 'prop-types';
import {AppContext} from "../contexts/AppContext";
import {addGoogleMapLocationControl} from "../api/googleMapLocationControl";
import {addGoogleMapElevationControl} from "../api/googleMapElevationControl";
import {CancelablePromise} from "../api/cancelablePromise";
import {geotag} from "../api/geotag";

function samePositions(pos1, pos2) {
	return pos1.lat() === pos2.lat() && pos1.lng() === pos2.lng();
}

export class GoogleView extends React.Component {
	constructor(props) {
		super(props);
		this.currentAddress = null;
		this.currentMarker = null;
		this.streetPositionIsManual = false;
		this.map = null;
		this.places = null;
		this.elevator = null;
		this.defaultPosition = null;
		this.currentCircle = null;
		this.flood = [];
		this.zone = null;
		this.geolocation = null;
		this.userAddress = null;
		this.displayStreet = this.displayStreet.bind(this);
		this.displayMap = this.displayMap.bind(this);
		this.markMapOn = this.markMapOn.bind(this);
		this.centerMap = this.centerMap.bind(this);
		this.centerStreet = this.centerStreet.bind(this);
		this.getUserLocation = this.getUserLocation.bind(this);
		this.getElevation = this.getElevation.bind(this);
		this.onMapClick = this.onMapClick.bind(this);
		this.computeElevationAlongPath = this.computeElevationAlongPath.bind(this);
	}

	render() {
		return <div id="google-map-view" className="my-4 flex-grow-1"/>;
	}

	streetIsVisible() {
		return this.map.getStreetView().getVisible();
	}

	displayStreet() {
		console.log(`Displaying street.`);
		this.streetPositionIsManual = true;
		this.map.getStreetView().setVisible(true);
	}

	displayMap() {
		this.map.getStreetView().setVisible(false);
	}

	searchAddress(query, nearLocation) {
		// resolve(address)
		// reject(status)
		const google = this.context.google;
		return new Promise((resolve, reject) => {
			const request = {
				query: query,
				fields: ['formatted_address', 'geometry', 'name'],
				locationBias: new google.maps.Circle({
					center: nearLocation,
					radius: 10
				})
			};
			this.places.findPlaceFromQuery(request, (results, status) => {
				if (status === google.maps.places.PlacesServiceStatus.OK && results.length)
					resolve(results[0].formatted_address);
				else
					reject(status);
			});
		});
	}

	markMapOn(position) {
		const google = this.context.google;
		if (this.currentMarker) {
			this.currentMarker.setMap(null);
			this.currentMarker = null;
		}
		// if (!this.props.displayUserRegions || !samePositions(position, this.geolocation))
		this.currentMarker = new google.maps.Marker({position: position, map: this.map});
		if (this.currentCircle) {
			this.currentCircle.setMap(null);
			this.currentCircle = null;
		}
		if (this.props.displayUserRegions && samePositions(position, this.geolocation)) {
			this.currentCircle = new google.maps.Circle({
				strokeColor: '#00FF00',
				strokeOpacity: 0.8,
				strokeWeight: 2,
				fillColor: '#00FF00',
				fillOpacity: 0.35,
				map: this.map,
				center: position,
				radius: 300, // in meters
			});
			this.currentCircle.addListener('click', this.onMapClick);
		}
		// Clean previous flood.
		if (this.flood.length) {
			for (let rectangle of this.flood) {
				rectangle.setMap(null);
			}
			this.flood = [];
		}

		if (this.zone) {
			this.zone.setMap(null);
			this.zone = null;
		}

		const d2m = function (d) {
			return d * (40000 * 1000) / 360;
		};

		const m2d = function (m) {
			return m * 360 / (40000 * 1000);
		};

		const defineRectangle = function (previousLatitude, previousLongitude) {
			const north = previousLatitude + (Math.random() < 0.5 ? -1 : 1) * m2d(Math.random() * 150 + 50);
			const west = previousLongitude + (Math.random() < 0.5 ? -1 : 1) * m2d(Math.random() * 150 + 50);
			return {
				north: north,
				south: north + m2d(200),
				west: west,
				east: west + m2d(200) * 1.5,
			};
		};

		// Draw next flood.
		if (this.props.displayUserRegions && samePositions(position, this.geolocation)) {
			const nbFlood = Math.round(Math.random() * 50 + 50);
			console.log(`Displaying ${nbFlood} flood regions.`);
			let bounds = null;
			for (let i = 0; i < nbFlood; ++i) {
				let lat = null;
				let lng = null;
				if (bounds) {
					lat = bounds.north;
					lng = bounds.west;
				} else {
					lat = m2d(d2m(position.lat()) + 300);
					lng = m2d(d2m(position.lng()) + 300);
				}
				bounds = defineRectangle(lat, lng);
				this.flood.push(new google.maps.Rectangle({
						strokeColor: '#33ccff',
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: '#33ccff',
						fillOpacity: 0.35,
						map: this.map,
						bounds: bounds
					})
				);
			}
		} else {
			const top = google.maps.geometry.spherical.computeOffset(position, 500, 0);
			const right = google.maps.geometry.spherical.computeOffset(position, 500, 90);
			const bottom = google.maps.geometry.spherical.computeOffset(position, 500, 180);
			const left = google.maps.geometry.spherical.computeOffset(position, 500, 270);
			this.zone = new google.maps.Rectangle({
				strokeColor: '#33ccff',
				strokeOpacity: 0.8,
				strokeWeight: 2,
				fillColor: '#33ccff',
				fillOpacity: 0.35,
				map: this.map,
				bounds: {north: top.lat(), south: bottom.lat(), east: right.lng(), west: left.lng()},
				editable: false
			});
			this.zone.addListener('click', this.onMapClick);
		}
	}

	onMapClick(ev) {
		const position = ev.latLng;
		this.centerMap(position);
		this.context.locationToAddress(position)
			.then(address => {
				this.currentAddress = address;
				this.props.onSelect(address)
			});
	}

	centerMap(position) {
		console.log(`Centering map to ${position.lat()} ; ${position.lng()}`);
		this.markMapOn(position);
		this.map.panTo(position);
	}

	centerStreet(position) {
		console.log(`Centering street to ${position.lat()} ; ${position.lng()}`);
		this.streetPositionIsManual = true;
		this.map.getStreetView().setPosition(position);
	}

	_createMapOn(defaultPosition) {
		const google = this.context.google;
		this.map = new google.maps.Map(document.getElementById('google-map-view'), {
			center: defaultPosition,
			zoom: 15,
			streetViewControl: false,
		});
		this.places = new google.maps.places.PlacesService(this.map);
		this.elevator = new google.maps.ElevationService();
		this.map.addListener('click', this.onMapClick);
		this.map.getStreetView().addListener('position_changed', () => {
			if (this.streetPositionIsManual) {
				return;
			}
			console.log(`Handling changed position on street.`);
			const location = this.map.getStreetView().getLocation();
			this.centerMap(location.latLng);
			this.searchAddress(location.description, location.latLng)
				.then(address => {
					this.currentAddress = address;
					this.props.onSelect(address)
				});
		});
		const streetControl = document.createElement('div');
		streetControl.classList.add('google-map-street-button');
		streetControl.textContent = 'Street';
		streetControl.index = 1;
		streetControl.addEventListener('click', () => {
			if (this.currentMarker) {
				const position = this.currentMarker.getPosition();
				this.centerStreet(position);
				this.displayStreet();
			}
		});
		this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(streetControl);
		addGoogleMapLocationControl(google, this.map, this.getUserLocation);
		addGoogleMapElevationControl(google, this.map, this.getElevation);
		document.getElementById('google-map-view').addEventListener('click', () => {
			if (this.streetIsVisible()) {
				console.log(`Clicked on street!`);
				this.streetPositionIsManual = false;
			}
		});
	}

	componentDidMount() {
		// Initialization.
		const google = this.context.google;
		// Use Montreal coordinates as default coordinates.
		const defaultPosition = new google.maps.LatLng(45.505331312, -73.55249779);
		this.defaultPosition = defaultPosition;
		if (this.props.address) {
			this.context.addressToLocation(this.props.address)
				.catch(error => {
					console.log(`Error while location for address ${this.props.address}:`, error);
					return this.defaultPosition;
				})
				.then(position => {
					this.currentAddress = this.props.address;
					this._createMapOn(position);
					this.centerMap(position);
					this.centerStreet(position);
					this.displayMap();
				})
		} else {
			this._createMapOn(defaultPosition);
			this.displayMap();
			if (this.props.guessInitialLocation) {
				this.getUserLocation();
			} else {
				this.centerMap(defaultPosition);
				this.centerStreet(defaultPosition);
				this.context.locationToAddress(defaultPosition)
					.then(address => {
						this.currentAddress = address;
					});
			}
		}
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
		if (!this.props.address
			|| prevProps.address === this.props.address
			|| this.currentAddress === this.props.address)
			return;
		this.context.addressToLocation(this.props.address)
			.catch(error => {
				console.log(`Error while location for address ${this.props.address}:`, error);
				return this.defaultPosition;
			})
			.then(position => {
				this.currentAddress = this.props.address;
				if (this.streetIsVisible())
					this.centerStreet(position);
				else
					this.centerMap(position);
			})
	}

	getUserLocation() {
		if (this.cancelablePromise)
			return;
		this.cancelablePromise = new CancelablePromise(geotag());
		this.cancelablePromise
			.promise
			.then((coords) => {
				if (!this.streetIsVisible()) {
					console.log(`Geolocation returned ${coords.latitude} ${coords.longitude}`);
					const position = new this.context.google.maps.LatLng(coords.latitude, coords.longitude);
					this.geolocation = position;
					this.centerMap(position);
					this.context.locationToAddress(position)
						.then(address => {
							this.currentAddress = address;
							this.userAddress = address;
							this.props.onSelect(address);
						});
				}
			})
			.catch(error => {
				if ('isCanceled' in error) {
					console.error('Geolocation was canceled.');
				} else if ("geolocationError" in error) {
					console.error(`Geolocation error. ${error.geolocationError}`);
				} else {
					console.error(`Error when getting user location.`);
					console.exception(error);
				}
			})
			.finally(() => {
				this.cancelablePromise = null;
			});
	}

	computeElevationAlongPath(from, to, nSamples) {
		return new Promise((resolve, reject) => {
			this.elevator.getElevationAlongPath(
				{path: [from, to], samples: nSamples},
				(results, status) => {
					if (status !== 'OK')
						return reject(status);
					if (results.length !== nSamples)
						return reject(`ERROR_SAMPLES`);
					resolve(results);
				}
			);
		});
	}

	computeElevationForCoordinates(coordinates) {
		return new Promise((resolve, reject) => {
			this.elevator.getElevationForLocations(
				{locations: coordinates},
				(results, status) => {
					if (status !== 'OK')
						return reject(status);
					if (results.length !== coordinates.length)
						return reject(`ERROR_SAMPLES`);
					resolve(results);
				}
			);
		});
	}

	getElevation() {
		if (this.zone) {
			const google = this.context.google;
			const bounds = this.zone.getBounds();
			const northEast = bounds.getNorthEast();
			const southWest = bounds.getSouthWest();
			const northWest = new google.maps.LatLng(northEast.lat(), southWest.lng());
			const southEast = new google.maps.LatLng(southWest.lat(), northEast.lng());

			const div = 20; // split 20 times => 50 meters of resolution in 1 kilometer
			const latGap = Math.abs(southWest.lat() - northWest.lat());
			const lngGap = Math.abs(southEast.lng() - southWest.lng());
			const latStep = -(latGap / div);
			const lngStep = lngGap / div;
			const side = div + 1;
			const nbPoints = side * side;
			const points = [northWest];
			for (let i = 1; i < nbPoints; ++i) {
				const previousPoint = points[points.length - 1];
				const previousLat = previousPoint.lat();
				const previousLng = previousPoint.lng();
				const lat = i % side === 0 ? previousLat + latStep : previousLat;
				const lng = i % side === 0 ? northWest.lng() : previousLng + lngStep;
				points.push(new google.maps.LatLng(lat, lng));
			}
			console.log(`Computed ${points.length} points.`);
			console.log(`Latest point: ${points[points.length - 1]} vs expected ${southEast}`);
			this.computeElevationForCoordinates(points)
				.then(results => {
					const output = {
						width: side,
						height: side,
						values: results.map(result => [
							result.location.lat(),
							result.location.lng(),
							result.elevation,
						])
					};
					const domLink = document.createElement('a');
					domLink.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(output)));
					domLink.setAttribute('download', `elevation.json`);
					domLink.style.display = 'none';
					document.body.appendChild(domLink);
					domLink.click();
					document.body.removeChild(domLink);
				})
				.catch(error => {
					const message = `An error occurred while computing elevation (${error}).`;
					console.exception(message);
					alert(message);
				})
		}
	}

	componentWillUnmount() {
		if (this.cancelablePromise)
			this.cancelablePromise.cancel();
	}
}

GoogleView.contextType = AppContext;
GoogleView.propTypes = {
	address: PropTypes.string.isRequired,
	onSelect: PropTypes.func.isRequired,
	guessInitialLocation: PropTypes.bool,
	displayUserRegions: PropTypes.bool
};
