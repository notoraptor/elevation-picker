import React from 'react';
import {AppContext, AppContextInstance} from "./contexts/AppContext";
import {Helmet} from 'react-helmet-async';
import {AddressManager} from "./components/AddressManager";
import Script from 'react-load-script';

export class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			context: new AppContextInstance(null, null)
		};
		this.loadGoogleContext = this.loadGoogleContext.bind(this);
	}

	loadGoogleContext() {
		this.setState({context: new AppContextInstance(this.pageLoader, window.google)});
	}

	render() {
		return (
			<AppContext.Provider value={this.state.context}>
				{this.state.context.google ? (
					<div className="container-fluid">
						<Helmet><title>Elevation Picker</title></Helmet>
						<div className="d-flex flex-column w-100 h-100">
							<h1 className="text-center">Elevation Picker</h1>
							<h4 className="text-center" id="info">&nbsp;</h4>
							<div className="flex-grow-1 map-container">
								<AddressManager/>
							</div>
						</div>
					</div>
				) : ''}
				<Script async defer
						url={`https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&libraries=places,geometry`}
						onLoad={this.loadGoogleContext}/>
			</AppContext.Provider>
		);
	}
}
