class Party {
  final String id;
  final String name;
  final String address;
  final String addressGu;
  final String addressHi;
  final String route;
  final String userId;
  final String password;
  final String status;
  final Map<String, Map<String, String>> rates;

  Party({
    required this.id,
    required this.name,
    required this.address,
    required this.addressGu,
    required this.addressHi,
    required this.route,
    required this.userId,
    required this.password,
    required this.status,
    required this.rates,
  });

  factory Party.fromFirestore(String id, Map<String, dynamic> data) {
    final rawRates = data['rates'] as Map<String, dynamic>? ?? {};
    final rates = <String, Map<String, String>>{};
    for (final catEntry in rawRates.entries) {
      final inner = catEntry.value as Map<String, dynamic>? ?? {};
      rates[catEntry.key] = inner.map((k, v) => MapEntry(k, v?.toString() ?? ''));
    }

    return Party(
      id: id,
      name: (data['name'] as String?) ?? '',
      address: (data['address'] as String?) ?? '',
      addressGu: (data['addressGu'] as String?) ?? '',
      addressHi: (data['addressHi'] as String?) ?? '',
      route: (data['route'] as String?) ?? '',
      userId: (data['userId'] as String?) ?? '',
      password: (data['password'] as String?) ?? '',
      status: (data['status'] as String?) ?? 'Enable',
      rates: rates,
    );
  }
}
