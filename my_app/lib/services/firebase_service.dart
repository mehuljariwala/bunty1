import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/color_model.dart';
import '../models/party_model.dart';
import '../models/order_model.dart' as models;

class FirebaseService {
  static final _firestore = FirebaseFirestore.instance;

  // --- Auth ---
  static Future<Party?> login(String userId, String password) async {
    final snap = await _firestore.collection('parties').get();
    for (final doc in snap.docs) {
      final data = doc.data();
      if (data['userId'] == userId && data['password'] == password) {
        final party = Party.fromFirestore(doc.id, data);
        if (party.status == 'Disable') return null;
        return party;
      }
    }
    return null;
  }

  // --- Colors ---
  static Future<List<YarnColor>> fetchColorsByCategory(String category) async {
    final snap = await _firestore
        .collection('colors')
        .orderBy('sortOrder')
        .get();
    return snap.docs
        .map((doc) => YarnColor.fromFirestore(doc.id, doc.data()))
        .where((c) => c.category == category)
        .toList();
  }

  static Future<List<String>> getCategories() async {
    final snap = await _firestore
        .collection('colors')
        .orderBy('sortOrder')
        .get();
    final categories = <String>{};
    for (final doc in snap.docs) {
      final cat = doc.data()['category'] as String? ?? '';
      if (cat.isNotEmpty) categories.add(cat);
    }
    return categories.toList();
  }

  // --- Orders ---
  static Future<List<models.Order>> fetchOrdersByParty(String partyName) async {
    final snap = await _firestore
        .collection('orders')
        .orderBy('csvId', descending: true)
        .get();
    return snap.docs
        .map((doc) => models.Order.fromFirestore(doc.id, doc.data()))
        .where((o) => o.partyName == partyName)
        .toList();
  }

  static Future<String> createOrder({
    required String partyName,
    required String partyAddress,
    required String route,
    required String type,
    required List<models.OrderItem> items,
    required int grandTotalOrdered,
    required int grandTotalDelivered,
  }) async {
    final lastSnap = await _firestore
        .collection('orders')
        .orderBy('csvId', descending: true)
        .limit(1)
        .get();
    final lastCsvId = lastSnap.docs.isEmpty
        ? 0
        : (lastSnap.docs.first.data()['csvId'] as num?)?.toInt() ?? 0;
    final nextCsvId = lastCsvId + 1;

    final ref = await _firestore.collection('orders').add({
      'csvId': nextCsvId,
      'partyName': partyName,
      'partyAddress': partyAddress,
      'route': route,
      'orderDate': DateTime.now().toIso8601String().split('T')[0],
      'type': type,
      'items': items.map((i) => i.toMap()).toList(),
      'grandTotalOrdered': grandTotalOrdered,
      'grandTotalDelivered': grandTotalDelivered,
      'createdAt': DateTime.now().toIso8601String(),
    });
    return ref.id;
  }
}
