var map;
var markersVisible = [];
var markersFavorite = [];
var markers = [];
var outputBlock = document.getElementById('output-block');
var outputPano = document.getElementById('output-block-pano');
var outputData = document.getElementById('output-block-data');
var outputWiki = document.getElementById('output-block-wiki');
var body = document.getElementsByTagName('body')[0];

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 59.9342802, lng: 30.3350986 },
        zoom: 11,
        mapTypeControl: false
    });

    var zoomAutocomplete = new google.maps.places.Autocomplete(document.getElementById('universal-search'));
    //zoomAutocomplete.bindTo('bounds', map);
    //// Create a searchbox in order to execute a places search
    //var searchBox = new google.maps.places.SearchBox(
    //    document.getElementById('places-search'));
    //// Bias the searchbox to within the bounds of the map.
    //searchBox.setBounds(map.getBounds());

    var markerInfo = new google.maps.InfoWindow();

    var iconDefault = makeMarkerIcon('ffffff');
    var iconFavorite = makeMarkerIcon('996699');

    function makeMarkerIcon(markerColor) {
        var markerImage = new google.maps.MarkerImage(
          'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
          '|40|_|%E2%80%A2',
          new google.maps.Size(21, 34),
          new google.maps.Point(0, 0),
          new google.maps.Point(10, 34),
          new google.maps.Size(21, 34));
        return markerImage;
    }

    var defaultLocations = [
        { title: "State Hermitage Museum", location: { lat: 59.939765, lng: 30.314514 }, placeId: 'ChIJ6eLLMgsxlkYR_F1QoCoDTgc', favorite:true },
        { title: "Peter and Paul Fortress", location: { lat: 59.9507272, lng: 30.3193458 }, placeId: 'ChIJfzxD1BQxlkYR9B3Ia2hJ7xU', favorite: true },
        { title: "Mariinsky Theatre", location: { lat: 59.9254282, lng: 30.2959277 }, placeId: 'ChIJw6wMCuMwlkYRzOE8T6Idd6o', favorite: true },
        { title: "Tauride Gardens", location: { lat: 59.94651940000001, lng: 30.3685902 }, placeId: 'ChIJDwMchpsxlkYRUISufCQ53A8', favorite: true },
        { title: "Smolny Cathedral", location: { lat: 59.9479349, lng: 30.3942818 }, placeId: 'ChIJpwGZM4kxlkYRjuEWdrqVLIA', favorite: true },
        { title: "Saint Petersburg's 300th Anniversary Park", location: { lat: 59.9828807, lng: 30.2014797 }, placeId: 'ChIJ65CvQWE2lkYRiNrWRdnnZUU', favorite: true }
    ];

    var bounds = new google.maps.LatLngBounds();

    for (var i = 0; i < defaultLocations.length; i++) {
        // Get the position from the location array.
        var position = defaultLocations[i].location;
        var title = defaultLocations[i].title;
        // Create a marker per location, and put into markers array.
        var marker = new google.maps.Marker({
            map: map,
            position: position,
            title: title,
            animation: google.maps.Animation.DROP,
            icon: defaultLocations[i].favorite ? iconFavorite : iconDefault,
            id: i,
            placeId: defaultLocations[i].placeId
        });
        // Push the marker to our array of markers.
        markersVisible.push(marker);
        // Create an onclick event to open the large infowindow at each marker.
        marker.addListener('click', function () {
            bounds = new google.maps.LatLngBounds();
            bounds.extend(this.position);
            map.fitBounds(bounds);
            //map.setCenter(this.position);
            map.setZoom(15);
            showInfoWindow(this, markerInfo);
            showOutputBlock(this);
        });

        fitToMarkers(markersVisible);
    }

    function fitToMarkers(markers) {
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(map);
            bounds.extend(markers[i].position);
        }
        map.fitBounds(bounds);
    }

    function showInfoWindow(marker, infowindow) {
        if (infowindow.marker != marker) {
            infowindow.setContent('');
            infowindow.marker = marker;
            infowindow.addListener('closeclick', function () {
                fitToMarkers(markersVisible);
                hideOutputBlock();
                infowindow.marker = null;
            });
            infowindow.setContent('<h3 class="infowindow-title">' + marker.title + '</h3>');
            infowindow.open(map, marker);
        }
    }

    function showOutputBlock(marker) {
        body.classList.add('output');

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


        getPlacesDetails(marker, outputData);

        outputWiki.innerHTML = '';
        var wikiRequestTimeout = setTimeout(function () {
            outputWiki.innerHTML = '<h3>Where are no wikipedia resources about this place</h3>';
        }, 5000);
        url = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.title + '&format=json&callback=wikiCallback';
        $.ajax({
            url: url,
            dataType: 'jsonp',
            success: function (data) {
                var articles = data[1];
                if (articles.length >= 1) {
                    outputWiki.innerHTML = '<h3>Wikipedia articles:</h3>';
                }
                for (var i = 0, l = articles.length; i < l; i++) {
                    var title = articles[i];
                    outputWiki.innerHTML +='<li><a href="http://en.wikipedia.org/wiki/' + title + '">' + title + '</a></li>';
                }
                outputWiki.innerHTML += '<br><br>';
            }
        }).done(function () {
            clearTimeout(wikiRequestTimeout);
        })
    }

    function hideOutputBlock() {
        body.classList.remove('output');
    }

    function getPlacesDetails(marker, element) {
        var service = new google.maps.places.PlacesService(map);
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
                        { maxHeight: 400, maxWidth: 360 }) + '">';
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

};

//var body = document.getElementsByTagName('body')[0];
//var inputBlock = document.getElementById('input-block');
//var outputBlock = document.getElementById('output-block');
//var cityInput = document.getElementById('city-input');
//var map;
//var geocoder;

//var model = {
//    currentAddress: ko.observable("Saint-Petersburg, Russia"),
//    hardcodedMarkers: [
//        { title: "State Hermitage Museum", location: { lat: 59.939765, lng: 30.314514 } },
//        { title: "Peter and Paul Fortress", location: { lat: 59.9507272, lng: 30.3193458 } },
//        { title: "Mariinsky Theatre", location: { lat: 59.9256452, lng: 30.2938087 } },
//        { title: "Tauride Gardens", location: { lat: 59.945957, lng: 30.3708423 } },
//        { title: "Smolny Cathedral", location: { lat: 59.9479349, lng: 30.3942818 } },
//        { title: "Saint Petersburg's 300th Anniversary Park", location: { lat: 59.9828578, lng: 30.2013929 } }
//    ]
//};

//function setCenterByAddress(address) {
//    geocoder.geocode({ 'address': address }, function (results, status) {
//        if (status == google.maps.GeocoderStatus.OK) {
//            map.setCenter(results[0].geometry.location);
//        } else {
//            alert("Geocode was not successful for the following reason: " + status);
//        }
//    });
//};

//function initMap() {
//    geocoder = new google.maps.Geocoder();
//    map = new google.maps.Map(document.getElementById('map'), {
//        center: { lat: 59.9171483, lng: 30.0448896 },
//        zoom: 11,
//        mapTypeControl: false
//    });
//    setCenterByAddress(model.currentAddress());
//};

//var viewModel = {
//    updateCity: function () {
//        model.currentAddress(cityInput.value);
//        setCenterByAddress(model.currentAddress());
//    },
//    closeBlock: function (block) {
//        body.classList.remove(block);
//    },
//    openBlock: function (block) {
//        body.classList.add(block);
//    }
//};
//ko.applyBindings(viewModel);