var map;
var outputBlock = document.getElementById('output-block');
var outputPano = document.getElementById('output-block-pano');
var outputData = document.getElementById('output-block-data');
var outputWiki = document.getElementById('output-block-wiki');
var inputBlock = document.getElementById('input-block');
var searchInput = document.getElementById('places-search');
var searchBtn = document.getElementById('places-search-go');
var inputBtn = document.getElementById('show-inputs');
var placesList = document.getElementById('places-list');
var container = document.getElementsByTagName('body')[0];

function viewModel() {
    var self = this;
    self.initialPlacesIds = [
        { placeId: 'ChIJ6eLLMgsxlkYR_F1QoCoDTgc' },
        { placeId: 'ChIJfzxD1BQxlkYR9B3Ia2hJ7xU' },
        { placeId: 'ChIJw6wMCuMwlkYRzOE8T6Idd6o' },
        { placeId: 'ChIJDwMchpsxlkYRUISufCQ53A8' },
        { placeId: 'ChIJpwGZM4kxlkYRjuEWdrqVLIA' },
        { placeId: 'ChIJ65CvQWE2lkYRiNrWRdnnZUU' }
    ];
    self.places = ko.observableArray();
    self.markersVisible = ko.observableArray();
    self.placeInfoWindow;
    self.bounds;

    self.initMap = function() {
        self.map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 59.9342802, lng: 30.3350986 },
            zoom: 11,
            mapTypeControl: false
        });

        self.boundsSPB = new google.maps.LatLngBounds();
        self.boundsSPB.extend(new google.maps.LatLng(60.089675, 30.559783));
        self.boundsSPB.extend(new google.maps.LatLng(59.74521590000001, 30.0903322));

        self.initInitialPlaces = function (placesIDs) {
            var placeInfoService = new google.maps.places.PlacesService(self.map);
            for (var i = 0; i < placesIDs.length; i++) {
                placeInfoService.getDetails(placesIDs[i], callback);
                function callback(place, status) {
                    if (status == google.maps.places.PlacesServiceStatus.OK) {
                        self.places.push(place);
                        createMarker(place);
                        fitToMarkers(self.markersVisible());
                    } else {
                        alert('initInitialPlaces() error: ' + status);
                    }
                }
            }
        }
        self.initInitialPlaces(self.initialPlacesIds);
        self.initInputs();
    };

    self.initInputs = function() {
        var searchBox = new google.maps.places.SearchBox(searchInput, {
            bounds: self.boundsSPB
        });

        searchBtn.addEventListener('click', function () {
            var placesService = new google.maps.places.PlacesService(self.map);
            placesService.textSearch({
                query: searchInput.value,
                bounds: self.boundsSPB
            }, function (results, status) {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    self.createMarkersForPlaces(results);
                } else {
                    alert('Error: ' + status);
                }
            });
        });
    }

    self.createMarker = function(place) {
        var icon = {
            url: place.icon,
            size: new google.maps.Size(30, 30),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(15, 15),
            scaledSize: new google.maps.Size(30, 30)
        };
        var marker = new google.maps.Marker({
            map: self.map,
            icon: icon,
            title: place.name,
            position: place.geometry.location,
            placeId: place.place_id
        });
        self.placeInfoWindow = new google.maps.InfoWindow();
        marker.addListener('click', function () {
            if (self.placeInfoWindow.marker == this) {
                console.log("This infowindow already is on this marker!");
            } else {
                showPlaceInfo(this);
            }
        });
        self.markersVisible.push(marker);
    }

    self.showPlaceInfo = function(marker) {
        self.bounds = new google.maps.LatLngBounds();
        self.bounds.extend(marker.position);
        self.map.fitBounds(bounds);
        self.map.setZoom(15);
        showInfoWindow(marker, self.placeInfoWindow);
        showOutputBlock(marker);
    }
    self.createMarkersForPlaces = function(places) {
        self.hideMarkers(self.markersVisible());
        self.markersVisible.removeAll();
        placesList.innerHTML = '';
        for (var i = 0; i < places.length; i++) {
            self.createMarker(places[i]);
        }
        fitToMarkers(self.markersVisible());
    }

    self.hideMarkers = function(markers) {
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
    }

    self.showInfoWindow = function(marker, infowindow) {
        if (infowindow.marker != marker) {
            infowindow.setContent('');
            infowindow.marker = marker;
            infowindow.setContent('<h3 class="infowindow-title">' + marker.title + '</h3>');
            infowindow.open(viewModel.map, marker);
            infowindow.addListener('closeclick', function () {
                self.fitToMarkers(self.markersVisible());
                self.hideOutputBlock();
                infowindow.marker = null;
            });
        }
    }

    self.fitToMarkers = function(markers) {
        self.bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(self.map);
            self.bounds.extend(markers[i].position);
        }
        self.map.fitBounds(bounds);
    }

    self.showOutputBlock = function(marker) {
        container.classList.add('output');
        var streetViewService = new google.maps.StreetViewService();
        var radius = 100;
        function getStreetView(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 30
                    },
                    addressControl: false
                };
                var panorama = new google.maps.StreetViewPanorama(outputPano, panoramaOptions);
            } else {
                outputPano.innerText = 'No Street View Found';
            }
        }
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);


        self.getPlacesDetails(marker, outputData);
        self.getPlaceWiki(marker, outputWiki);
    }

    self.hideOutputBlock = function() {
        container.classList.remove('output');
    }

    self.getPlacesDetails = function(marker, element) {
        var service = new google.maps.places.PlacesService(self.map);
        service.getDetails({
            placeId: marker.placeId
        }, function (place, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                var innerHTML = '<div>';
                //if (place.name) {
                //    innerHTML += '<strong>' + place.name + '</strong>';
                //}
                if (place.photos) {
                    innerHTML += '<img src="' + place.photos[0].getUrl(
                        { maxHeight: 400, maxWidth: 340 }) + '">';
                }
                if (place.formatted_address) {
                    innerHTML += '<br>' + place.formatted_address;
                }
                if (place.formatted_phone_number) {
                    innerHTML += '<br>' + place.formatted_phone_number;
                }
                if (place.opening_hours) {
                    innerHTML += '<br><br><strong>Hours:</strong><br>' +
                        place.opening_hours.weekday_text[0] + '<br>' +
                        place.opening_hours.weekday_text[1] + '<br>' +
                        place.opening_hours.weekday_text[2] + '<br>' +
                        place.opening_hours.weekday_text[3] + '<br>' +
                        place.opening_hours.weekday_text[4] + '<br>' +
                        place.opening_hours.weekday_text[5] + '<br>' +
                        place.opening_hours.weekday_text[6];
                }
                innerHTML += '<br><br></div>';
                element.innerHTML = innerHTML;
            }
        });
    }

    self.getPlaceWiki = function(marker, element) {
        element.innerHTML = '';
        var wikiRequestTimeout = setTimeout(function () {
            element.innerHTML = '<h3>Where are no wikipedia resources about this place</h3>';
        }, 5000);
        url = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.title + '&format=json&callback=wikiCallback';
        $.ajax({
            url: url,
            dataType: 'jsonp',
            success: function (data) {
                var articles = data[1];
                if (articles.length >= 1) {
                    element.innerHTML = '<h3>Wikipedia articles:</h3>';
                }
                for (var i = 0, l = articles.length; i < l; i++) {
                    var title = articles[i];
                    element.innerHTML += '<li><a href="http://en.wikipedia.org/wiki/' + title + '">' + title + '</a></li>';
                }
                element.innerHTML += '<br><br>';
            }
        }).done(function () {
            clearTimeout(wikiRequestTimeout);
        })
    }
};




ko.applyBindings(viewModel());