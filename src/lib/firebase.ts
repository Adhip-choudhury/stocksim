import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDa4ebjJlP9PqebGJ5tTBWPjvJ4kDlwnLg",
  authDomain: "stocksim-5823c.firebaseapp.com",
  projectId: "stocksim-5823c",
  storageBucket: "stocksim-5823c.firebasestorage.app",
  messagingSenderId: "362882317414",
  appId: "1:362882317414:web:40ee0ecbd25a0f38edc1a7",
  measurementId: "G-VCJEL0WGD3",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
