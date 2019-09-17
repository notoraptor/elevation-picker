import React from "react";
import PropTypes from "prop-types";
import {Search} from "./search";
import {GoogleView} from "./GoogleView";


export class AddressManager extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			// search
			address: '',
			places: [],
			currentFocus: -1,
			autocomplete: true,
			autocompleteHasFocus: false,
			error: '',
			// address manager
			selectedAddress: '',
		};
		this.onSearchChange = this.onSearchChange.bind(this);
		this.onSelectSearchAddress = this.onSelectSearchAddress.bind(this);
		this.onSelectMapAddress = this.onSelectMapAddress.bind(this);
	}

	setState(state) {
		return new Promise(resolve => super.setState(state, resolve));
	}

	onSelectMapAddress(address) {
		console.log(`Selected from map: ${address}`);
		return this.setState({selectedAddress: address, address: address, error: ''});
	}

	onSelectSearchAddress(address) {
		console.log(`Selected from search; ${address}`);
		return this.setState({selectedAddress: address, error: ''});
	}

	onSearchChange(newState) {
		return this.setState(newState);
	}

	render() {
		return (
			<div className="d-flex flex-column h-100">
				<Search search={this.state}
						onChange={this.onSearchChange}
						onSelect={this.onSelectSearchAddress}/>
				{this.state.error ? <div className="error-message pt-4 px-2">{this.state.error}</div> : ''}
				<GoogleView address={this.state.selectedAddress}
							onSelect={this.onSelectMapAddress}
							guessInitialLocation={this.props.guessInitialLocation}
							displayUserRegions={this.props.displayUserRegions}/>
			</div>
		);
	}
}

AddressManager.propTypes = {
	guessInitialLocation: PropTypes.bool,
	displayUserRegions: PropTypes.bool
};
