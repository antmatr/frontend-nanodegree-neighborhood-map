function viewModel() {
    let self = this;

    // Array of hardcoded PlaceId's to initialization
    self.initialPlacesIds = [
        { placeId: 'ChIJ6eLLMgsxlkYR_F1QoCoDTgc' },
        { placeId: 'ChIJfzxD1BQxlkYR9B3Ia2hJ7xU' },
        { placeId: 'ChIJw6wMCuMwlkYRzOE8T6Idd6o' },
        { placeId: 'ChIJDwMchpsxlkYRUISufCQ53A8' },
        { placeId: 'ChIJpwGZM4kxlkYRjuEWdrqVLIA' },
        { placeId: 'ChIJ65CvQWE2lkYRiNrWRdnnZUU' },
        { placeId: 'ChIJFfDEyroxlkYRrvHa-8ocW_k' },
        { placeId: 'ChIJ8bLVp2w0lkYRZZrGUSC-PJI' }
    ];
    self.markers = [];
    self.markersVisible = ko.observableArray();
    self.outputBlockActive = ko.observable(false);
    self.outputBlockInfo = ko.observable('Click on a marker to see additional information.');
    self.outputBlockWiki = ko.observable('');

    // Filters used in places list
    self.placesFilters = [
        {
            name: 'All',
            filter: 'all'
        },
        {
            name: 'Foods',
            filter: 'restaurant'
        },
        {
            name: 'Malls',
            filter: 'shopping_mall'
        },
        {
            name: 'Museums',
            filter: 'museum'
        },
        {
            name: 'Parks',
            filter: 'park'
        }
    ];
    self.currentFilter = ko.observable(self.placesFilters[0].filter);

    self.initMap = () => {
        // Base map, centred on Saint-Petersburg City
        self.map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 59.9342802, lng: 30.3350986 },
            zoom: 11,
            mapTypeControl: false
        });

        // Bounds of the City borders
        self.boundsSPB = new google.maps.LatLngBounds();
        self.boundsSPB.extend(new google.maps.LatLng(60.089675, 30.559783));
        self.boundsSPB.extend(new google.maps.LatLng(59.74521590000001, 30.0903322));

        // Function for transformation of initialPlacesIds
        // into real google.maps place-objects for further use
        self.initInitialPlaces = (placesIDs) => {
            let placeInfoService = new google.maps.places.PlacesService(self.map);
            let places = [];
            let callback = (place, status) => {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    places.push(place);
                    if (places.length == placesIDs.length) {
                        // As soon as we've got last place respond
                        // we create markets for those places
                        self.createMarkers(places);
                    }
                } else {
                    alert('initInitialPlaces() error: ' + status);
                }
            };
            for (let i = 0; i < placesIDs.length; i++) {
                placeInfoService.getDetails(placesIDs[i], callback);
                
            }
        };
        self.initInitialPlaces(self.initialPlacesIds);
        self.initInputs();
    };

    // Searchbox and SearchBtn initialization
    self.initInputs = () => {
        let searchInput = document.getElementById('places-search');
        let searchBox = new google.maps.places.SearchBox(searchInput, {
            bounds: self.boundsSPB
        });
        document.getElementById('places-search-go').addEventListener('click', () => {
            let placesService = new google.maps.places.PlacesService(self.map);
            placesService.textSearch({
                query: searchInput.value,
                bounds: self.boundsSPB
            }, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    self.createMarkers(results);
                } else {
                    alert('Failed to get data from Google Places (error: ' + status + ')');
                }
            });
        });
    };

    // Check if marker belongs to this type of places
    self.checkMarkerType = (type, marker) => {
        if (type === 'all') {
            return true;
        }
        for (let i = 0; i < marker.types.length; i++) {
            if (marker.types[i] === type && type != 'other') {
                return true;
            }
        }
        return false;
    };

    // Filtering for list and markers
    self.updateFilters = (filter) => {
        // do somthing only if it is not the same filter:
        if (self.currentFilter() != filter) {
            self.currentFilter(filter);
            self.hideMarkers(self.markersVisible());
            self.markersVisible.removeAll();
            if (filter === 'all') {
                for (let i = 0; i < self.markers.length; i++) {
                    self.markersVisible.push(self.markers[i]);
                }
            } else {
                for (let i = 0; i < self.markers.length; i++) {
                    if (self.markers[i].types.indexOf(filter) != -1) {
                        self.markersVisible.push(self.markers[i]);
                    }
                }
            }
            for (let i = 0; i < self.markersVisible().length; i++) {
                self.markersVisible()[i].setMap(self.map);
            }
            fitToMarkers(self.markersVisible());
        }
    };

    // Update additional place information
    self.showPlaceInfo = (marker) => {
        fitToMarkers([marker]);
        showInfoWindow(marker, self.placeInfoWindow);
        showOutputBlock(marker);
    };

    // Create markers for the given array of places
    self.createMarkers = (places) => {
        self.hideMarkers(self.markersVisible());
        self.markers = [];
        for (let i = 0; i < places.length; i++) {
            let icon = {
                url: places[i].icon,
                size: new google.maps.Size(30, 30),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(15, 15),
                scaledSize: new google.maps.Size(30, 30)
            };
            let marker = new google.maps.Marker({
                map: self.map,
                icon: icon,
                title: places[i].name,
                position: places[i].geometry.location,
                placeId: places[i].place_id,
                types: places[i].types
            });
            self.placeInfoWindow = new google.maps.InfoWindow();
            marker.addListener('click', function() {
                if (self.placeInfoWindow.marker == this) {
                    console.log("This infowindow already is on this marker!");
                } else {
                    showPlaceInfo(this);
                }
            });
            self.markers.push(marker);
        }
        showMarkers(self.markers);
    };

    self.hideMarkers = (markers) => {
        for (let i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        self.markersVisible.removeAll();
    };

    self.showMarkers = (markers) => {
        for (let i = 0; i < markers.length; i++) {
            self.markersVisible.push(markers[i]);
            markers[i].setMap(self.map);
        }
        fitToMarkers(self.markersVisible());
    };

    // Markers infowindow function
    self.showInfoWindow = (marker, infowindow) => {
        if (infowindow.marker != marker) {
            infowindow.marker = marker;
            infowindow.setContent('<h3 class="infowindow-title">' + marker.title + '</h3>');
            infowindow.open(self.map, marker);
            marker.setAnimation(google.maps.Animation.BOUNCE);
            infowindow.addListener('closeclick', () => {
                self.fitToMarkers(self.markersVisible());
                self.outputBlockActive(false);
                marker.setAnimation(null);
                infowindow.marker = null;
            });
        }
    };

    // map fit function
    self.fitToMarkers = (markers) => {
        if (markers.length > 0) {
            let bounds = new google.maps.LatLngBounds();
            for (let i = 0; i < markers.length; i++) {
                markers[i].setMap(self.map);
                bounds.extend(markers[i].position);
            }
            self.map.fitBounds(bounds);
            if (markers.length == 1) {
                // if there are only One marker in set (filtered, for example)
                // map will be zoomed out to prevent too much zoom in
                self.map.setZoom(15);
            }
        } else {
            // if there are Zero markers in set (filtered, for example)
            // map will be fitted to the City boundaries
            self.map.fitBounds(self.boundsSPB);
        }
    };

    // function of place additional info Compilation
    self.showOutputBlock = function (marker) {

        // if output block was hidden - it will be shown
        // (used for small screens)
        self.outputBlockActive(true);

        // google.places for additional info (Address, Phone, Image, Open Hours);
        self.getPlacesDetails(marker);

        // wikipedia API for some articles about selected place
        self.getPlaceWiki(marker);

        // creating google street view panorama
        let streetViewService = new google.maps.StreetViewService();
        let radius = 100;
        let outputPano = document.getElementById('output-block-pano');
        getStreetView = (data, status) => {
            if (status == google.maps.StreetViewStatus.OK) {
                let nearStreetViewLocation = data.location.latLng;
                let heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
                let panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 30
                    },
                    addressControl: false
                };
                let panorama = new google.maps.StreetViewPanorama(outputPano, panoramaOptions);
            } else {
                outputPano.innerText = 'Failed to get data from Google Street View (error: ' + status + ')';
            }
        }
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
    };

    self.getPlacesDetails = (marker) => {
        let service = new google.maps.places.PlacesService(self.map);
        service.getDetails({
            placeId: marker.placeId
        }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                let innerHTML = '<div>';
                if (place.photos) {
                    innerHTML += '<img src="' + place.photos[0].getUrl(
                        { maxHeight: 400, maxWidth: 340 }) + '">';
                }
                if (place.formatted_address) {
                    innerHTML += '<br><br><strong>Address:</strong> ' + place.formatted_address;
                }
                if (place.formatted_phone_number) {
                    innerHTML += '<br><br><strong>Phone:</strong> ' + place.formatted_phone_number;
                }
                if (place.opening_hours) {
                    innerHTML += '<br><br><strong>Open hours:</strong><br>' +
                        place.opening_hours.weekday_text[0] + '<br>' +
                        place.opening_hours.weekday_text[1] + '<br>' +
                        place.opening_hours.weekday_text[2] + '<br>' +
                        place.opening_hours.weekday_text[3] + '<br>' +
                        place.opening_hours.weekday_text[4] + '<br>' +
                        place.opening_hours.weekday_text[5] + '<br>' +
                        place.opening_hours.weekday_text[6];
                }
                innerHTML += '</div>';
                self.outputBlockInfo(innerHTML);
            }
            else {
                self.outputBlockInfo('Failed to get data from Google Places (error: ' + status + ')');
            }
        });
    };

    self.getPlaceWiki = (marker) => {
        self.outputBlockWiki('');
        let url = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.title + '&maxage=5&origin=*&format=json';

        function loadWikiArticles() {
            let xmlhttp = new XMLHttpRequest();
            let articles;
            let innerHtml = '';

            xmlhttp.onreadystatechange = () => {
                if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                    if (xmlhttp.status == 200) {
                        articles = JSON.parse(xmlhttp.responseText)[1];
                        if (articles.length >= 1) {
                            innerHtml = '<h3>Wikipedia articles:</h3>';
                            for (let i = 0, l = articles.length; i < l; i++) {
                                let title = articles[i];
                                innerHtml += `<li><a href="http://en.wikipedia.org/wiki/${title}">${title}</a></li>`;
                            }
                            innerHtml += '<br><br>';
                            self.outputBlockWiki(innerHtml);
                        } else {
                            self.outputBlockWiki('<h3>There are no wikipedia resources about this place</h3>');
                        }
                    }
                    else {
                        self.outputBlockWiki(`Failed to get data from Wikipedia (error: response status: ${xmlhttp.status})`);
                    }
                }
            };
            xmlhttp.open("GET", url, true);
            xmlhttp.send();
        }
        loadWikiArticles();
    };

}

ko.applyBindings(viewModel);

function googleError() {
    alert('Failed to connect Google Maps API');
}