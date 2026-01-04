// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDIavtqqbPS2CJLemJrwSxmQOVb9oQfdJ8',
  authDomain: 'trophy-roller.firebaseapp.com',
  databaseURL:
    'https://trophy-roller-default-rtdb.europe-west1.firebasedatabase.app/',
  projectId: 'trophy-roller',
  storageBucket: 'trophy-roller.firebasestorage.app',
  messagingSenderId: '796334054586',
  appId: '1:796334054586:web:7ab800cb80104b5b997683',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
