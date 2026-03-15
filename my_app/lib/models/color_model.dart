class YarnColor {
  final String id;
  final String name;
  final String code;
  final String hex;
  final String category;
  final String subCategory;
  final int minStock;
  final int maxStock;
  final int currentStock;
  final bool runningColor;
  final int sortOrder;

  YarnColor({
    required this.id,
    required this.name,
    required this.code,
    required this.hex,
    required this.category,
    required this.subCategory,
    required this.minStock,
    required this.maxStock,
    required this.currentStock,
    required this.runningColor,
    required this.sortOrder,
  });

  factory YarnColor.fromSupabase(Map<String, dynamic> data) {
    return YarnColor(
      id: data['id']?.toString() ?? '',
      name: (data['name'] as String?) ?? '',
      code: (data['code'] as String?) ?? '',
      hex: (data['hex'] as String?) ?? '#000000',
      category: (data['category'] as String?) ?? '',
      subCategory: (data['sub_category'] as String?) ?? '',
      minStock: (data['min_stock'] as num?)?.toInt() ?? 0,
      maxStock: (data['max_stock'] as num?)?.toInt() ?? 0,
      currentStock: (data['current_stock'] as num?)?.toInt() ?? 0,
      runningColor: (data['running_color'] as bool?) ?? false,
      sortOrder: (data['sort_order'] as num?)?.toInt() ?? 0,
    );
  }

  factory YarnColor.fromFirestore(String id, Map<String, dynamic> data) {
    return YarnColor(
      id: id,
      name: (data['name'] as String?) ?? '',
      code: (data['code'] as String?) ?? '',
      hex: (data['hex'] as String?) ?? '#000000',
      category: (data['category'] as String?) ?? '',
      subCategory: (data['subCategory'] as String?) ?? '',
      minStock: (data['minStock'] as num?)?.toInt() ?? 0,
      maxStock: (data['maxStock'] as num?)?.toInt() ?? 0,
      currentStock: (data['currentStock'] as num?)?.toInt() ?? 0,
      runningColor: (data['runningColor'] as bool?) ?? false,
      sortOrder: (data['sortOrder'] as num?)?.toInt() ?? 0,
    );
  }
}
