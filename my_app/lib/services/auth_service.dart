import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/party_model.dart';
import 'firebase_service.dart';

class AuthService {
  static const _key = 'logged_in_party';

  static Future<void> saveSession(Party party) async {
    final prefs = await SharedPreferences.getInstance();
    final data = {
      'id': party.id,
      'name': party.name,
      'address': party.address,
      'addressGu': party.addressGu,
      'addressHi': party.addressHi,
      'route': party.route,
      'userId': party.userId,
      'password': party.password,
      'status': party.status,
    };
    await prefs.setString(_key, jsonEncode(data));
  }

  static Future<Party?> getSession() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return null;
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      return Party(
        id: data['id'] ?? '',
        name: data['name'] ?? '',
        address: data['address'] ?? '',
        addressGu: data['addressGu'] ?? '',
        addressHi: data['addressHi'] ?? '',
        route: data['route'] ?? '',
        userId: data['userId'] ?? '',
        password: data['password'] ?? '',
        status: data['status'] ?? 'Enable',
        rates: {},
      );
    } catch (_) {
      return null;
    }
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }

  static Future<Party?> login(String userId, String password) async {
    final party = await FirebaseService.login(userId, password);
    if (party != null) {
      await saveSession(party);
    }
    return party;
  }

  static Future<void> logout() async {
    await clearSession();
  }
}
