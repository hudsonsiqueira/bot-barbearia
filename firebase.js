// firebase.js

const admin = require('firebase-admin');

// Importa a chave do serviço gerada no Firebase Console
const serviceAccount = require('./firebaseKey.json');

// Inicializa o Firebase Admin SDK com a chave
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Exporta o Firestore para usar em outros arquivos (como no chatbot.js)
const db = admin.firestore();

module.exports = db;

