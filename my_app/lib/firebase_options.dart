import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;

class DefaultFirebaseOptions {
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBUp2ODHF6k2pVaYY26jY4cyLCbou5kxXg',
    authDomain: 'meet-hub-3c03e.firebaseapp.com',
    projectId: 'meet-hub-3c03e',
    storageBucket: 'meet-hub-3c03e.firebasestorage.app',
    messagingSenderId: '17836504239',
    appId: '1:17836504239:web:0145ed139dafe24462d05a',
    measurementId: 'G-YNNNRP88PX',
  );

  static FirebaseOptions get currentPlatform => web;
}
