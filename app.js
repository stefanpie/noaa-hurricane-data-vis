var app = new Vue({
	el: "#app",
	data: {
		map: null,
		tileLayer: null,
		hurricanes: [],
		filteredHurricanes: [],
		filteredHurricanesMapLayer: null,
		filteredHurricanesLayers: [],
		filterOptions: {
			startYear: 2016,
			endYear: 2018,
			nameATCF: ""
		},
		
		selectedHurricane: null,
		windChart: null,
		pressureChart: null,
		hurricaneMarkerGroups: [],
		hurricaneTracks: []
	},
	mounted: function () {
		this.initMap();
		this.initCharts();
		this.loadHurricaneData();
	},

	methods: {
		initMap: function () {
			this.map = L.map('map').setView([25.734677, -80.162236], 6);

			this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attributionControl: false
			});
			this.tileLayer.addTo(this.map);
			document.getElementsByClassName('leaflet-control-attribution')[0].style.display = 'none';

			this.filteredHurricanesMapLayer = L.featureGroup();
			this.filteredHurricanesMapLayer.addTo(this.map);
		},

		initCharts: function () {},

		loadHurricaneData: function () {
			var vm = this;
			axios.get("hurdat2_1950.json")
				.then(function (response) {
					// vm.hurricanes = response.data;
					response.data.forEach(function (d) {
						vm.hurricanes.push(d);
					});
					vm.optionChanged();
				})
				.catch(function (error) {
					console.log(error);
				});
		},

		getSubLayers: function (layer) {
			var layers = [];
			function r(something) {
				layers.push(something);
				if (something instanceof L.LayerGroup) {
					for (var i = 0; i < something.getLayers().length; i++) {
						r(something.getLayers()[i]);
					}
				}
			}
			r(layer);
			return layers;
		},

		optionChanged: function () {
			console.log("change");

			var vm = this;

			function filterUsingOptions(hurricane) {
				var afterStartYearFlag;
				var beforeEndYearFlag;
				var matchNameATCF;

				if (vm.filterOptions.startYear === "" || vm.filterOptions.startYear === null) {
					afterStartYearFlag = true;
				} else {
					afterStartYearFlag = hurricane.fixes[0].year >= vm.filterOptions.startYear;
				}
				if (vm.filterOptions.endYear === "" || vm.filterOptions.endYear === null) {
					beforeEndYearFlag = true;
				} else {
					beforeEndYearFlag = hurricane.fixes[0].year <= vm.filterOptions.endYear;
				}

				if (vm.filterOptions.nameATCF === "" || vm.filterOptions.nameATCF === null) {
					matchNameATCF = true;
				} else {
					matchNameATCF = hurricane.storm_name.toLowerCase().trim() === vm.filterOptions.nameATCF.toLowerCase().trim() || hurricane.ATCF_code.toLowerCase().trim() === vm.filterOptions.nameATCF.toLowerCase().trim();
				}

				return afterStartYearFlag && beforeEndYearFlag && matchNameATCF;
			}

			var filteredList = this.hurricanes.filter(filterUsingOptions);

			this.filteredHurricanes = [];
			filteredList.forEach(function (d) {
				vm.filteredHurricanes.push(d);
			});
			
			this.hurricaneMarkerGroups = [];
			this.hurricaneTracks = [];
			
			this.filteredHurricanesMapLayer.clearLayers();
			this.filteredHurricanesLayers = [];
			this.selectedHurricane = null;

			this.filteredHurricanes.forEach(function (h) {
				
				var hurricaneLayer = L.featureGroup();
				var hurricaneLayerMarkers = L.featureGroup();
				hurricaneLayerMarkers.enabled = false;

				//				console.log(h);
				var latlngs = [];

				h.fixes.forEach(function (fix) {
					latlngs.push([fix.latitude, fix.longitude]);
					var fixMarker = L.marker([fix.latitude, fix.longitude], {
						title: fix.dateime_iso,
						opacity: 1
					});
					fixMarker.bindPopup('<strong>' + h.storm_name + '</strong>' +
						'<br>' + '<strong>' + fix.dateime_iso + '</strong>' +
						'<br>' + "Strom Status: " + fix.storm_status +
						'<br>' + "Special Entries: " + fix.special_entries +
						'<br>' + "Latitude: " + fix.latitude +
						'<br>' + "Longitude: " + fix.longitude +
						'<br>' + "Max Sus. Wind: " + fix.max_sus_wind +
						'<br>' + "Minimum Pressure: " + fix.min_pressure);

					// TODO: work on dynamic markers based on stom status and presure / wind
					fixMarker.addTo(hurricaneLayerMarkers);
				});
				
				vm.hurricaneMarkerGroups.push(hurricaneLayerMarkers);
				
				var polyline = L.polyline(latlngs, {
					color: '#3388ff',
					smoothFactor: 0.1,
					weight: 4
				});

//				polyline.bindPopup('<strong>' + h.storm_name + '</strong>' +
//					'<br>' + h.ATCF_code +
//					'<br>' + h.fixes[0].year);

				
				polyline.on('click', function () {
					if (hurricaneLayerMarkers.enabled === false) {
						vm.filteredHurricanesLayers.forEach(function(x){
							x.markerLayer.removeFrom(x.hurricaneLayer);
							x.markerLayer.enabled = false;
						});
						hurricaneLayerMarkers.addTo(hurricaneLayer);
						hurricaneLayerMarkers.enabled = true;
						vm.selectedHurricane = h;
						
					} else {
						hurricaneLayerMarkers.removeFrom(hurricaneLayer);
						hurricaneLayerMarkers.enabled = false;
						vm.selectedHurricane = null;
					}
				});
				
				polyline.addTo(hurricaneLayer);
				hurricaneLayer.addTo(vm.filteredHurricanesMapLayer);
				
				var hurricaneMapReferences = {
					hurricane: h,
					hurricaneLayer: hurricaneLayer,
					markerLayer: hurricaneLayerMarkers,
					trackLayer: polyline
				};
				vm.filteredHurricanesLayers.push(hurricaneMapReferences);
				
			});
		},

		resultClicked: function (event, data) {
			this.optionChanged();
			this.selectedHurricane = data;
			this.filteredHurricanesLayers.forEach(function(h){
				if (h.hurricane.ATCF_code === data.ATCF_code){
					h.markerLayer.addTo(h.hurricaneLayer);
					h.markerLayer.enabled = true;
				}
			});
		},


		clearAll: function (event) {
			event.preventDefault();
			this.optionChanged();
			this.selectedHurricane = null;
		}


	}
});
