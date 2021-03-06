// app config
import {loadScript} from '../config';
import {keys} from '../config/keys';
// app functions
import {handleSearchBarSelection} from './autocompleteFunctions';
import {findInArray, openOneInfoWindow, createContentStringMapClick} from './sharedFunctions';

export const handleRenderMap = (props) => {
    window.initMap = () => {_initGoogleMap(props)};
        loadScript(`https://maps.googleapis.com/maps/api/js?key=${keys.googleMapsJavaScriptApiKey}&libraries=places&callback=initMap`);
}
const _initGoogleMap = (props) => {
    // map initialization
    const defaultLoc = new window.google.maps.LatLng(50 , 50);

    const map = new window.google.maps.Map(document.getElementById('map'), {
        center: defaultLoc,
        zoom: 11
    });
    // call action to add map to state
    props.initMap(map);

    // set geolocalization
    getCurrentLocationFromBrowser(map);
    // set SearchBar as input  
    var input = document.getElementById('autocomplete_searchbar');
    var options = {
        types: ['(cities)'],
    };
    var autocomplete = new window.google.maps.places.Autocomplete(input, options);
    autocomplete.bindTo('bounds', map);

    // #LISTENERS
    // add listener for mouse click on map
    map.addListener('click', async (event) => {
      const result = await _placeMarkerAndPanTo(event.latLng, map, props);
      if(result)
        props.changeCurrentSnackbar(result);

    });
    // add listener for autocomplete after selection from SearchBar
    autocomplete.addListener('place_changed', () => {
        handleSearchBarSelection(autocomplete, map, props);
    })
}

export const getPlaceByGeocodeLatLng = (input, map, place, props, next , marker) => {
    return new Promise((resolve, reject) => {

      const geocoder = new window.google.maps.Geocoder;
  
      const latlngStr = input.split(',', 2);
      const latlng = {lat: parseFloat(latlngStr[0]), lng: parseFloat(latlngStr[1])};
  
      geocoder.geocode({'location': latlng}, (results, status) => {
  
        if (status === 'OK') {
          if (results[0]) {
            map.setZoom(7);
            const parameters = {
              latlng: latlng, 
              map: map, 
              input: input, 
              results: results[0], 
              props: props,
              marker: marker,
              place: place
            };
            // call next function
            switch(next){
                case '_addMarkerAfterClickOnMap': {
                    _addMarkerAfterClickOnMap(parameters);
                    break;
                }
                case '_findAndSelectStoredMarker': {
                    _findAndSelectStoredMarker(parameters);
                    break;
                }
                default:
                  break;
            }
          } else {
            resolve('NO_RESULTS_FOUND');
          }
        } else {
          // delete marker when no result has been found
          if(marker)
            marker.setMap(null);
  
          switch(status){
            case 'OVER_QUERY_LIMIT':
              resolve(status);
              break;
            case 'ZERO_RESULTS':
              resolve(status);
              break;
            default:
              // default alert for unhandled error status codes
              window.alert('Geocoder failed due to: ' + status); 
              break;
          }
        }
      });
    })
}
export const findAndDeleteStoredMarker = (parameters) => {

    var {props, place} = parameters;

    // search for existing marker & infoWindow
    let markerFromStore = findInArray(props.markers, place.marker);
    let infoWindowFromStore = findInArray(props.infoWindows, place.infowindow);

    // delete marker
    if(markerFromStore && infoWindowFromStore){
        markerFromStore.setMap(null);
        // call action - delete marker
        props.deleteMarker(markerFromStore);
        
        // call action - delete infowindow
        props.deleteInfoWindow(infoWindowFromStore);

        // delete stored location element
        props.deleteOneLocationFromLocationList(place);
    }
}
const _placeMarkerAndPanTo =  (latLng, map, props) => {
    return new Promise(async (resolve, reject) => {

      // calculate lat lng
      const marker = new window.google.maps.Marker({
          position: latLng,
          map: map,
          animation: window.google.maps.Animation.DROP
      });
  
      map.panTo(latLng);
      
      const input = `${marker.getPosition().lat()},${marker.getPosition().lng()}`; //[TODO] > throw to shared functions
  
      // translate latlng to place object >> call redux action
      const resultFromGeo = await getPlaceByGeocodeLatLng(input, map,  null, props, '_addMarkerAfterClickOnMap', marker);
      resolve(resultFromGeo);
    })
}

export const getCurrentLocationFromBrowser = (map) => {

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        var pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        map.setCenter(pos);
      });
    } else {
        // Browser doesn't support Geolocation
        _handleLocationError(false, map.getCenter(), map);
    }
}
const _handleLocationError = (infoWindow, pos, map) => {
    const browserHasGeolocation = new window.google.maps.InfoWindow;

    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
      'Error: The Geolocation service failed.' :
      'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
}

const _addMarkerAfterClickOnMap = (parameters) => {
    
    var {props, map, results, input, marker} = parameters;

    // add marker & infowindow after click on map 
    props.addMarker(marker);
    const infowindow = new window.google.maps.InfoWindow;
    
    const objToSend = {
        latLng: input, 
        locationName: results.formatted_address,
        sendToList: false,
        marker: marker,
        infowindow: infowindow,
        detailed: createObjectFromResult(results)
    }
    // set label
    infowindow.setContent(createContentStringMapClick(objToSend));
    
    // call action - add location to location buffer store
    props.addOneLocationToBufferList(objToSend);

    // call action - add infowindow to store
    props.addInfoWindow(infowindow);

    // get current state of infowindows
    const currentInfoWindows = props.getCurrentInfoWindows();
    // open infoWindow
    if (props.showAllInfoWindows)
      infowindow.open(map, marker);
    else {
      openOneInfoWindow(currentInfoWindows, infowindow, marker, map);
    }

}

const _findAndSelectStoredMarker = (parameters) => {

    var {props, map, results, place} = parameters;
    //search for existing marker & infowindow in store
    let markerFromStore = findInArray(props.markers, place.marker);
    let infoWindowFromStore = findInArray(props.infoWindows, place.infowindow);
    if (infoWindowFromStore){
      const input = `${markerFromStore.getPosition().lat()},${markerFromStore.getPosition().lng()}`; // [TODO] > throw to shared functions
      const objToSend = {
        latLng: input, 
        locationName: results.formatted_address,
        detailed: createObjectFromResult(results)
    }
      infoWindowFromStore.setContent(createContentStringMapClick(objToSend));

      if (props.showAllInfoWindows)
        infoWindowFromStore.open(map, markerFromStore);  
      else
        openOneInfoWindow(props.infoWindows, infoWindowFromStore, markerFromStore, map);
    }
}

export const createObjectFromResult = (result) => {

  let newObj = {};
  const address = result.address_components;
  for(let i = 0;i < address.length;i++){

    const types = address[i].types;
    for(let i2 = 0; i2 < types.length; i2++){

      switch(types[i2]){
        case 'locality':
          newObj.town = address[i].long_name;
          break;
        case 'street_number':
          newObj.streetNumber = address[i].long_name;
          break;
        case 'route':
          newObj.route = address[i].long_name;
          break;
        case 'administrative_area_level_1':
          newObj.political = address[i].long_name;
          break;
        case 'administrative_area_level_2':
          newObj.area = address[i].long_name;
          break;
        case 'country':
          newObj.country = address[i].long_name;
          break;
        case 'postal_code':
          newObj.postalCode = address[i].long_name;
          break;
        default:
          break;
      }
    }
  }
  return newObj;
}
