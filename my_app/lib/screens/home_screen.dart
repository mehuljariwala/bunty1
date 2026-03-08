import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../app_theme.dart';
import '../models/color_model.dart';
import '../models/party_model.dart';
import '../models/order_model.dart';
import '../services/firebase_service.dart';
import '../widgets/app_header.dart';

class HomeScreen extends StatefulWidget {
  final Party? party;
  const HomeScreen({super.key, this.party});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  List<String> _categories = [];
  Map<String, List<YarnColor>> _colorsByCategory = {};
  bool _loading = true;
  final Map<String, int> _quantities = {};
  TabController? _tabController;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _tabController?.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final cats = await FirebaseService.getCategories();
    final Map<String, List<YarnColor>> colorMap = {};
    for (final cat in cats) {
      colorMap[cat] = await FirebaseService.fetchColorsByCategory(cat);
    }
    if (mounted) {
      setState(() {
        _categories = cats;
        _colorsByCategory = colorMap;
        _tabController = TabController(length: cats.length, vsync: this);
        _tabController!.addListener(() => setState(() {}));
        _loading = false;
      });
    }
  }

  String _colorKey(YarnColor c) => '${c.category}::${c.name}';

  int get _totalColors => _quantities.values.where((q) => q > 0).length;
  int get _totalQuantity => _quantities.values.fold(0, (a, b) => a + b);

  void _increment(String key) {
    setState(() => _quantities[key] = (_quantities[key] ?? 0) + 1);
  }

  void _decrement(String key) {
    setState(() {
      final current = _quantities[key] ?? 0;
      if (current > 0) _quantities[key] = current - 1;
    });
  }

  void _reset() => setState(() => _quantities.clear());

  Future<void> _sendWhatsApp() async {
    final lines = <String>[];
    if (widget.party != null) {
      lines.add('*Party: ${widget.party!.name}*');
    }
    for (final cat in _categories) {
      final colors = _colorsByCategory[cat] ?? [];
      final catItems = <String>[];
      for (final c in colors) {
        final qty = _quantities[_colorKey(c)] ?? 0;
        if (qty > 0) catItems.add('${c.name}: $qty');
      }
      if (catItems.isNotEmpty) {
        lines.add('');
        lines.add('*${cat.toUpperCase()}*');
        lines.addAll(catItems);
      }
    }
    if (_totalQuantity > 0) {
      lines.add('');
      lines.add('Total Colors: $_totalColors');
      lines.add('Total Quantity: $_totalQuantity');
    }
    final message = Uri.encodeComponent(lines.join('\n'));
    final uri = Uri.parse('https://wa.me/919998478787?text=$message');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _submitOrder() async {
    if (widget.party == null || _totalQuantity == 0) return;
    setState(() => _sending = true);

    final items = <OrderItem>[];
    for (final cat in _categories) {
      final colors = _colorsByCategory[cat] ?? [];
      for (final c in colors) {
        final qty = _quantities[_colorKey(c)] ?? 0;
        if (qty > 0) {
          items.add(OrderItem(
            category: c.category,
            material: c.subCategory,
            color: c.name,
            orderedQty: qty,
            deliveredQty: qty,
          ));
        }
      }
    }

    try {
      await FirebaseService.createOrder(
        partyName: widget.party!.name,
        partyAddress: widget.party!.address,
        route: widget.party!.route,
        type: 'Running',
        items: items,
        grandTotalOrdered: _totalQuantity,
        grandTotalDelivered: _totalQuantity,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Text('Order placed successfully!'),
              ],
            ),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        _reset();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.error, behavior: SnackBarBehavior.floating),
        );
      }
    }
    if (mounted) setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.surface,
        body: Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
      );
    }

    final currentCat = _categories.isNotEmpty && _tabController != null
        ? _categories[_tabController!.index]
        : '';
    final currentColors = _colorsByCategory[currentCat] ?? [];
    final midpoint = (currentColors.length / 2).ceil();
    final leftColors = currentColors.isNotEmpty ? currentColors.sublist(0, midpoint) : <YarnColor>[];
    final rightColors = currentColors.length > midpoint ? currentColors.sublist(midpoint) : <YarnColor>[];

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          const AppHeader(compact: true),

          // Category Tabs
          Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              isScrollable: _categories.length > 3,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textMuted,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 1),
              unselectedLabelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              tabs: _categories.map((cat) {
                // Count items in this category
                final catQty = (_colorsByCategory[cat] ?? [])
                    .fold(0, (sum, c) => sum + (_quantities[_colorKey(c)] ?? 0));
                return Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(cat.toUpperCase()),
                      if (catQty > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '$catQty',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          // Summary bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 4, 14, 10),
            child: Row(
              children: [
                if (widget.party != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.person_outline_rounded, size: 13, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text(
                          widget.party!.name,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                ] else
                  const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: _totalQuantity > 0
                        ? AppColors.primary.withValues(alpha: 0.06)
                        : AppColors.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _totalQuantity > 0 ? AppColors.primary.withValues(alpha: 0.15) : AppColors.border,
                    ),
                  ),
                  child: Row(
                    children: [
                      Text(
                        'Colors: $_totalColors',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: _totalQuantity > 0 ? AppColors.primary : AppColors.textSecondary,
                        ),
                      ),
                      Container(width: 1, height: 14, color: AppColors.border, margin: const EdgeInsets.symmetric(horizontal: 8)),
                      Text(
                        'Qty: $_totalQuantity',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: _totalQuantity > 0 ? AppColors.primary : AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Color grid
          Expanded(
            child: currentColors.isEmpty
                ? const Center(child: Text('No colors in this category', style: TextStyle(color: AppColors.textSecondary)))
                : SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                    child: IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              children: leftColors
                                  .map((c) => _ColorRow(
                                        color: c,
                                        quantity: _quantities[_colorKey(c)] ?? 0,
                                        onIncrement: () => _increment(_colorKey(c)),
                                        onDecrement: () => _decrement(_colorKey(c)),
                                      ))
                                  .toList(),
                            ),
                          ),
                          Expanded(
                            child: Column(
                              children: rightColors
                                  .map((c) => _ColorRow(
                                        color: c,
                                        quantity: _quantities[_colorKey(c)] ?? 0,
                                        onIncrement: () => _increment(_colorKey(c)),
                                        onDecrement: () => _decrement(_colorKey(c)),
                                      ))
                                  .toList(),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
          ),

          // Bottom action bar
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, -2)),
              ],
            ),
            padding: EdgeInsets.only(
              left: 12,
              right: 12,
              top: 10,
              bottom: MediaQuery.of(context).padding.bottom + 10,
            ),
            child: Row(
              children: [
                // Reset
                _BottomAction(
                  icon: Icons.refresh_rounded,
                  label: 'RESET',
                  color: AppColors.textPrimary,
                  borderColor: AppColors.border,
                  onTap: _reset,
                ),
                const SizedBox(width: 8),
                // WhatsApp Send
                _BottomAction(
                  icon: Icons.chat_rounded,
                  label: 'SEND',
                  color: const Color(0xFF25D366),
                  borderColor: const Color(0xFF25D366).withValues(alpha: 0.4),
                  onTap: _totalQuantity > 0 ? _sendWhatsApp : null,
                ),
                if (widget.party != null) ...[
                  const SizedBox(width: 8),
                  // Submit Order
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: _totalQuantity > 0 && !_sending ? _submitOrder : null,
                      icon: _sending
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.shopping_cart_checkout_rounded, size: 17),
                      label: Text(
                        _sending ? 'PLACING...' : 'PLACE ORDER',
                        style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.5, fontSize: 13),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.4),
                        disabledForegroundColor: Colors.white70,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color borderColor;
  final VoidCallback? onTap;

  const _BottomAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.borderColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: enabled ? borderColor : AppColors.border, width: 1.2),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: enabled ? color : AppColors.textMuted),
              const SizedBox(width: 5),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: enabled ? color : AppColors.textMuted,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ColorRow extends StatelessWidget {
  final YarnColor color;
  final int quantity;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  const _ColorRow({
    required this.color,
    required this.quantity,
    required this.onIncrement,
    required this.onDecrement,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = quantity > 0;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 2.5, horizontal: 4),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
      decoration: BoxDecoration(
        color: isActive ? AppColors.primary.withValues(alpha: 0.04) : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isActive ? AppColors.primary.withValues(alpha: 0.15) : AppColors.border.withValues(alpha: 0.5),
          width: isActive ? 1 : 0.5,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              color.name.toUpperCase(),
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: isActive ? AppColors.primary : AppColors.textPrimary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          SizedBox(
            width: 22,
            child: Text(
              '$quantity',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: isActive ? AppColors.primary : AppColors.textSecondary,
              ),
            ),
          ),
          const SizedBox(width: 3),
          GestureDetector(
            onTap: onDecrement,
            child: Container(
              width: 28,
              height: 26,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.4), width: 1.5),
              ),
              child: const Icon(Icons.remove, size: 15, color: AppColors.error),
            ),
          ),
          const SizedBox(width: 3),
          GestureDetector(
            onTap: onIncrement,
            child: Container(
              width: 28,
              height: 26,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.success.withValues(alpha: 0.4), width: 1.5),
              ),
              child: const Icon(Icons.add, size: 15, color: AppColors.success),
            ),
          ),
        ],
      ),
    );
  }
}
