// app.js

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');


//const radius = 5000; // Rayon de recherche en mètres
const researchScore = 4;
// Récupérer la clé API depuis le fichier .env
const apiKey = process.env.GOOGLE_MAPS_API_KEY;

// URL de l'API Google Places Nearby Search
const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;


// Google Geocoding API URL
const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';


// Fonction pour récupérer les lieux touristiques avec une note >= 4
async function getTouristAttractions(latitude,longitude, radius) {

  try {
    const response = await axios.get(url, {
      params: {
        location: `${latitude},${longitude}`,
        radius: radius,
        type: 'tourist_attraction', // Filtre pour les lieux touristiques
        key: apiKey
      }
    });


    let places = response.data.results;

    // Filtrer les lieux avec une note >= 4
   


    if (response.data.next_page_token) {
        const nextPageResponse = await axios.get(url, {
          params: {
            pagetoken: response.data.next_page_token,
            key: apiKey
          }
        });
        // Traiter la page suivante
        places = [...places, ...nextPageResponse.data.results]

        if (nextPageResponse.data.next_page_token) {
            const next1PageResponse = await axios.get(url, {
              params: {
                pagetoken: nextPageResponse.data.next_page_token,
                key: apiKey
              }
            });
            // Traiter la page suivante
            places = [...places, ...next1PageResponse.data.results]

            if (next1PageResponse.data.next_page_token) {
                const next2PageResponse = await axios.get(url, {
                  params: {
                    pagetoken: next1PageResponse.data.next_page_token,
                    key: apiKey
                  }
                });
                // Traiter la page suivante
                places = [...places, ...next2PageResponse.data.results]
            }
        }
    }


    // Afficher les lieux filtrés
    // filteredPlaces.forEach(place => {
    //   console.log(`Name: ${place.name}, Rating: ${place.rating}`);
    // });
    // console.log(places,'places')
    const filteredPlaces = places.filter(place => place.rating >= researchScore);
    generateCSV(filteredPlaces) 

  } catch (error) {
    console.error('Error fetching data from Google Places API:', error);
  }
}


// Function to geocode a place using Google Geocoding API
async function geocodePlaceStart(placeName, radius) {


    try {
      const response = await axios.get(geocodeUrl, {
        params: {
          address: placeName,
          key: apiKey
        }
      });
      const data = response.data;
      //console.log(data.results[0], 'data')
      if (data.status === 'OK') {
        const location = data.results[0].geometry.location;
        getTouristAttractions(location.lat, location.lng, radius )
        // return {
        //   name: place.name,
        //   latitude: location.lat,
        //   longitude: location.lng
        // };
      } else {
        console.error(`Error geocoding ${placeName}: ${data.status}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching data for ${placeName}:`, error);
      return null;
    }
  }


// Function to geocode a place using Google Geocoding API
async function geocodePlace(place) {
    try {
      const response = await axios.get(geocodeUrl, {
        params: {
          address: place.name,
          key: apiKey
        }
      });
      const data = response.data;
      //console.log(data.results[0], 'data')
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

// Main function to geocode places and generate the CSV file
async function generateCSV(places) {
    let csvContent = 'name,latitude,longitude,rating,addr,photo\n';
  
    for (const place of places) {
      const geocodedPlace = await geocodePlace(place);
    //   console.log(place?.geometry)
      if (geocodedPlace) {
        csvContent += `${geocodedPlace.name},${geocodedPlace.latitude},${geocodedPlace.longitude},${place.rating},${place.vicinity.replaceAll(',','')},https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place?.photos[0]?.photo_reference}&key=${apiKey}\n`;
      }
    }
  
    // Write the CSV content to a file
    fs.writeFile('places_geocoded.csv', csvContent, 'utf8', function(err) {
      if (err) {
        console.error('Error writing CSV file:', err);
      } else {
        console.log('CSV file generated successfully: places_geocoded.csv');
      }
    });
  }

// Appel de la fonction
geocodePlaceStart('Temple of Khnum', 100000)