import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {firebaseConfig} from '../config/firebaseConfig';

function uploadjson() {
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = getDatabase(app);
  const ref = push(ref(db, 'meal-deals-2b177'));
  set(ref, {
    name: 'Los Angeles',
    state: 'CA',
    country: 'USA'
  });
}

// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);