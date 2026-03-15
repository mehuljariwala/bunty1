class OrderItem {
  final String category;
  final String material;
  final String color;
  final int orderedQty;
  final int deliveredQty;

  OrderItem({
    required this.category,
    required this.material,
    required this.color,
    required this.orderedQty,
    required this.deliveredQty,
  });

  factory OrderItem.fromMap(Map<String, dynamic> data) {
    return OrderItem(
      category: (data['category'] as String?) ?? '',
      material: (data['material'] as String?) ?? '',
      color: (data['color'] as String?) ?? '',
      orderedQty: (data['orderedQty'] as num?)?.toInt() ?? 0,
      deliveredQty: (data['deliveredQty'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'category': category,
        'material': material,
        'color': color,
        'orderedQty': orderedQty,
        'deliveredQty': deliveredQty,
      };
}

class Order {
  final String id;
  final int csvId;
  final String partyName;
  final String partyAddress;
  final String route;
  final String orderDate;
  final String type;
  final List<OrderItem> items;
  final int grandTotalOrdered;
  final int grandTotalDelivered;

  Order({
    required this.id,
    required this.csvId,
    required this.partyName,
    required this.partyAddress,
    required this.route,
    required this.orderDate,
    required this.type,
    required this.items,
    required this.grandTotalOrdered,
    required this.grandTotalDelivered,
  });

  factory Order.fromSupabase(Map<String, dynamic> data) {
    final rawItems = data['items'] as List<dynamic>? ?? [];
    final items = rawItems
        .map((i) => OrderItem.fromMap(i as Map<String, dynamic>))
        .toList();
    return Order(
      id: data['id']?.toString() ?? '',
      csvId: (data['csv_id'] as num?)?.toInt() ?? 0,
      partyName: (data['party_name'] as String?) ?? '',
      partyAddress: (data['party_address'] as String?) ?? '',
      route: (data['route'] as String?) ?? '',
      orderDate: (data['order_date'] as String?) ?? '',
      type: (data['type'] as String?) ?? 'Complete',
      items: items,
      grandTotalOrdered: (data['grand_total_ordered'] as num?)?.toInt() ?? 0,
      grandTotalDelivered: (data['grand_total_delivered'] as num?)?.toInt() ?? 0,
    );
  }

  factory Order.fromFirestore(String id, Map<String, dynamic> data) {
    final rawItems = data['items'] as List<dynamic>? ?? [];
    final items = rawItems
        .map((i) => OrderItem.fromMap(i as Map<String, dynamic>))
        .toList();
    return Order(
      id: id,
      csvId: (data['csvId'] as num?)?.toInt() ?? 0,
      partyName: (data['partyName'] as String?) ?? '',
      partyAddress: (data['partyAddress'] as String?) ?? '',
      route: (data['route'] as String?) ?? '',
      orderDate: (data['orderDate'] as String?) ?? '',
      type: (data['type'] as String?) ?? 'Complete',
      items: items,
      grandTotalOrdered: (data['grandTotalOrdered'] as num?)?.toInt() ?? 0,
      grandTotalDelivered: (data['grandTotalDelivered'] as num?)?.toInt() ?? 0,
    );
  }
}
