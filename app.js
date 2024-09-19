require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const researchScore = 4;
const apiKey = process.env.GOOGLE_MAPS_API_KEY;

const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

// Fonction pour récupérer les lieux touristiques avec une note >= 4
async function getTouristAttractions(latitude, longitude, radius) {
  try {
    let response = await axios.get(url, {
      params: {
        location: `${latitude},${longitude}`,
        radius: radius,
        type: 'tourist_attraction',
        key: apiKey
      }
    });

    let places = response.data.results;

    // Gestion de la pagination
    while (response.data.next_page_token) {
      response = await axios.get(url, {
        params: {
          pagetoken: response.data.next_page_token,
          key: apiKey
        }
      });
      places = [...places, ...response.data.results];
    }

    const filteredPlaces = places.filter(place => place.rating >= researchScore);
    generateCSV(filteredPlaces);
  } catch (error) {
    console.error('Error fetching data from Google Places API:', error);
  }
}

// Fonction pour géocoder un lieu à partir du nom (Google Geocoding API)
async function geocodePlaceStart(placeName, radius) {
  try {
    const response = await axios.get(geocodeUrl, {
      params: {
        address: placeName,
        key: apiKey
      }
    });
    const data = response.data;

    if (data.status === 'OK') {
      const location = data.results[0].geometry.location;
      getTouristAttractions(location.lat, location.lng, radius);
    } else {
      console.error(`Error geocoding ${placeName}: ${data.status}`);
    }
  } catch (error) {
    console.error(`Error fetching data for ${placeName}:`, error);
  }
}

// Fonction pour géocoder un lieu (détails supplémentaires)
async function geocodePlace(place) {
  try {
    const response = await axios.get(geocodeUrl, {
      params: {
        address: place.name,
        key: apiKey
      }
    });
    const data = response.data;

    if (data.status === 'OK') {
      const location = data.results[0].geometry.location;
      return {
        name: place.name,
        latitude: location.lat,
        longitude: location.lng
      };
    } else {
      console.error(`Error geocoding ${place.name}: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching data for ${place.name}:`, error);
    return null;
  }
}

// Fonction pour générer le fichier CSV
async function generateCSV(places) {
  let csvContent = 'name,latitude,longitude,rating,addr,photo\n';

  for (const place of places) {
    const geocodedPlace = await geocodePlace(place);
    if (geocodedPlace) {
      csvContent += `${geocodedPlace.name},${geocodedPlace.latitude},${geocodedPlace.longitude},${place.rating},${place.vicinity.replaceAll(',', '')},https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place?.photos && place?.photos[0]?.photo_reference}&key=${apiKey}\n`;
    }
  }

  // Écriture du fichier CSV
  fs.writeFile('places_geocoded.csv', csvContent, 'utf8', function(err) {
    if (err) {
      console.error('Error writing CSV file:', err);
    } else {
      console.log('CSV file generated successfully: places_geocoded.csv');
    }
  });
}

// Appel de la fonction principale
geocodePlaceStart('Temple of Khnum', 100000);
