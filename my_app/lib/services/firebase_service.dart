import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/color_model.dart';
import '../models/party_model.dart';
import '../models/order_model.dart' as models;

class FirebaseService {
  static SupabaseClient get _client => Supabase.instance.client;

  // --- Auth ---
  static Future<Party?> login(String userId, String password) async {
    final response = await _client
        .from('parties')
        .select()
        .eq('user_id', userId)
        .eq('password', password)
        .limit(1)
        .maybeSingle();
    if (response == null) return null;
    final party = Party.fromSupabase(response);
    if (party.status == 'Disable') return null;
    return party;
  }

  // --- Colors ---
  static Future<List<YarnColor>> fetchColorsByCategory(String category) async {
    final response = await _client
        .from('colors')
        .select()
        .eq('category', category)
        .order('sort_order');
    return (response as List)
        .map((row) => YarnColor.fromSupabase(row))
        .toList();
  }

  static Future<List<String>> getCategories() async {
    final response = await _client
        .from('colors')
        .select('category')
        .order('sort_order');
    final categories = <String>{};
    for (final row in response) {
      final cat = row['category'] as String? ?? '';
      if (cat.isNotEmpty) categories.add(cat);
    }
    return categories.toList();
  }

  // --- Orders ---
  static Future<List<models.Order>> fetchOrdersByParty(String partyName) async {
    final response = await _client
        .from('orders')
        .select()
        .eq('party_name', partyName)
        .order('csv_id', ascending: false);
    return (response as List)
        .map((row) => models.Order.fromSupabase(row))
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
    final lastOrder = await _client
        .from('orders')
        .select('csv_id')
        .order('csv_id', ascending: false)
        .limit(1)
        .maybeSingle();
    final lastCsvId = (lastOrder?['csv_id'] as num?)?.toInt() ?? 0;
    final nextCsvId = lastCsvId + 1;

    final response = await _client.from('orders').insert({
      'csv_id': nextCsvId,
      'party_name': partyName,
      'party_address': partyAddress,
      'route': route,
      'order_date': DateTime.now().toIso8601String().split('T')[0],
      'type': type,
      'items': items.map((i) => i.toMap()).toList(),
      'grand_total_ordered': grandTotalOrdered,
      'grand_total_delivered': grandTotalDelivered,
      'created_at': DateTime.now().toIso8601String(),
    }).select('id').single();
    return response['id'] as String;
  }
}
