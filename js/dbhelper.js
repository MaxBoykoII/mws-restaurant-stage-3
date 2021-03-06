import { openDB } from 'idb';

/**
 * Common database helper functions.
 */
export class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

  static get dbPromise() {
    return openDB('restaurants-db', 1, {
      upgrade: upgradeDb => {
        upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
        upgradeDb.createObjectStore('reviews', { keyPath: 'createdAt' })
      }
    })
  }

  /**
   * Fetch all restaurants.
   */
  static async fetchRestaurants(callback) {
    const restaurants_url = `${DBHelper.DATABASE_URL}/restaurants`;
    const reviews_url = `${DBHelper.DATABASE_URL}/reviews`;

    const response = await fetch(restaurants_url).catch(_ => null);

    if (!response || response.status !== 200) {
      console.log('Request for restaurant data failed...using idb cache instead...');
      const cache = await DBHelper.loadCachedRestaurants();
      callback(null, cache);

      return;
    }
    const restaurants = await response.json();

    const reviewResponses = await Promise.all(restaurants.map(({ id }) => fetch(`${reviews_url}/?restaurant_id=${id}`)));
    const reviews = (await Promise.all(reviewResponses.flatMap(res => res.json()))).flatMap(r => r);

    reviews.forEach(({ restaurant_id, ...review }) => {
      const restaurant = restaurants.find(restaurant => restaurant.id === restaurant_id);

      if (!restaurant.reviews)
        restaurant.reviews = [];

      restaurant.reviews.push(review);
    });

    await DBHelper.updateIdb(restaurants);

    callback(null, restaurants);
  }

  static async updateIdb(newRestaurants) {
    const db = await DBHelper.dbPromise;

    const tx = db.transaction('restaurants', 'readwrite');
    const store = tx.objectStore('restaurants');

    const savedRestaurants = await store.getAll();

    for (let restaurant of savedRestaurants) {
      store.delete(restaurant.id);
    }

    for (let restaurant of newRestaurants) {
      store.put(restaurant);
    }

    await tx.complete;
  }

  static async updateRestaurant(restaurant) {
    const db = await DBHelper.dbPromise;

    const tx = db.transaction('restaurants', 'readwrite');
    const store = tx.objectStore('restaurants');

    store.put(restaurant);

    await tx.complete;
  }

  static async addPendingReview(review) {
    const db = await DBHelper.dbPromise;
    console.log('adding a pending review', review);
    const tx = db.transaction('reviews', 'readwrite');
    const store = tx.objectStore('reviews');

    store.put(review);

    await tx.complete;

    console.log('success, pending review has been added', review);
  }

  static async getPendingReviews() {
    const db = await DBHelper.dbPromise;

    const tx = db.transaction('reviews');
    const store = tx.objectStore('reviews');

    const restaurants = await store.getAll();

    await tx.complete;

    return restaurants;
  }

  static async removePendingReview(review) {
    const db = await DBHelper.dbPromise;

    const tx = db.transaction('reviews', 'readwrite');
    const store = tx.objectStore('reviews');

    store.delete(review.createdAt);

    await tx.complete;
  }

  static async loadCachedRestaurants() {
    const db = await DBHelper.dbPromise;

    const tx = db.transaction('restaurants');
    const store = tx.objectStore('restaurants');

    const restaurants = await store.getAll();

    await tx.complete;

    return restaurants;
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return `/img/${restaurant.photograph || restaurant.id}.jpg`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  static async toggleIsFavorite(restaurant) {
    try {
      const isFavorite = DBHelper.parseFavorite(restaurant);

      await DBHelper.updateRestaurant(restaurant);

      await fetch(`${DBHelper.DATABASE_URL}/restaurants/${restaurant.id}/?is_favorite=${isFavorite}`, {
        method: 'PUT'
      });
    }
    catch (error) {
      console.log('unable to update restaurant...', restaurant, error);
    }
  }

  static parseFavorite(restaurant) {
    switch (restaurant.is_favorite) {
      case true:
        return true;
      case false:
        return false;
      case 'true':
        return true;
      case 'false':
        return false;
    }

    return false;
  }

  static async uploadReview(restaurant, review) {
    try {
      const createdAt = +Date.now();
      restaurant.reviews.push({ ...review, createdAt });

      await DBHelper.updateRestaurant(restaurant);

      if (navigator.serviceWorker && 'SyncManager' in window) {
        const sw = await navigator.serviceWorker.ready;

        sw.sync.register('sync-new-reviews');

        await DBHelper.addPendingReview({ ...review, createdAt });
      } else {

        await fetch(`${DBHelper.DATABASE_URL}/reviews/`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(review)
        });
      }
    }

    catch (e) {
      console.error(e);
      console.log('unable to add a new review for restaurant', restaurant);
    }
  }
}

