import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../app_theme.dart';
import '../models/color_model.dart';
import '../models/party_model.dart';
import '../models/order_model.dart';
import '../services/firebase_service.dart';
import '../widgets/app_header.dart';

class ColorSelectionScreen extends StatefulWidget {
  final String category;
  final Party? party;

  const ColorSelectionScreen({super.key, required this.category, this.party});

  @override
  State<ColorSelectionScreen> createState() => _ColorSelectionScreenState();
}

class _ColorSelectionScreenState extends State<ColorSelectionScreen> {
  final Map<String, int> _quantities = {};
  List<YarnColor> _colors = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _loadColors();
  }

  Future<void> _loadColors() async {
    final colors = await FirebaseService.fetchColorsByCategory(widget.category);
    if (mounted) {
      setState(() {
        _colors = colors;
        _loading = false;
      });
    }
  }

  int get _totalColors => _quantities.values.where((q) => q > 0).length;
  int get _totalQuantity => _quantities.values.fold(0, (a, b) => a + b);

  void _increment(String colorName) {
    setState(() {
      _quantities[colorName] = (_quantities[colorName] ?? 0) + 1;
    });
  }

  void _decrement(String colorName) {
    setState(() {
      final current = _quantities[colorName] ?? 0;
      if (current > 0) _quantities[colorName] = current - 1;
    });
  }

  void _reset() {
    setState(() => _quantities.clear());
  }

  Future<void> _sendWhatsApp() async {
    final lines = <String>[];
    if (widget.party != null) {
      lines.add('*Party: ${widget.party!.name}*');
    }
    lines.add('*${widget.category.toUpperCase()} Order*');
    lines.add('');
    for (final color in _colors) {
      final qty = _quantities[color.name] ?? 0;
      if (qty > 0) lines.add('${color.name}: $qty');
    }
    lines.add('');
    lines.add('Total Colors: $_totalColors');
    lines.add('Total Quantity: $_totalQuantity');

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
    for (final color in _colors) {
      final qty = _quantities[color.name] ?? 0;
      if (qty > 0) {
        items.add(OrderItem(
          category: color.category,
          material: color.subCategory,
          color: color.name,
          orderedQty: qty,
          deliveredQty: qty,
        ));
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
          SnackBar(
            content: Text('Failed to place order: $e'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
    if (mounted) setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    final midpoint = (_colors.length / 2).ceil();
    final leftColors = _colors.isNotEmpty ? _colors.sublist(0, midpoint) : <YarnColor>[];
    final rightColors = _colors.length > midpoint ? _colors.sublist(midpoint) : <YarnColor>[];

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          const AppHeader(compact: true),

          // Sub-header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Icon(Icons.arrow_back_rounded, size: 18, color: AppColors.textPrimary),
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: AppColors.textPrimary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(fontSize: 13, color: Colors.white),
                      children: [
                        const TextSpan(text: 'SELECTED TAR: '),
                        TextSpan(
                          text: widget.category.toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: _totalQuantity > 0
                        ? AppColors.primary.withValues(alpha: 0.08)
                        : AppColors.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _totalQuantity > 0 ? AppColors.primary.withValues(alpha: 0.2) : AppColors.border,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Colors: $_totalColors',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: _totalQuantity > 0 ? AppColors.primary : AppColors.textSecondary,
                        ),
                      ),
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

          // Color list
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(strokeWidth: 2.5))
                : _colors.isEmpty
                    ? const Center(
                        child: Text('No colors found', style: TextStyle(fontSize: 15, color: AppColors.textSecondary)),
                      )
                    : SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                        child: IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  children: leftColors
                                      .map((c) => _ColorRow(
                                            color: c,
                                            quantity: _quantities[c.name] ?? 0,
                                            onIncrement: () => _increment(c.name),
                                            onDecrement: () => _decrement(c.name),
                                          ))
                                      .toList(),
                                ),
                              ),
                              Expanded(
                                child: Column(
                                  children: rightColors
                                      .map((c) => _ColorRow(
                                            color: c,
                                            quantity: _quantities[c.name] ?? 0,
                                            onIncrement: () => _increment(c.name),
                                            onDecrement: () => _decrement(c.name),
                                          ))
                                      .toList(),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
          ),

          // Bottom actions
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, -2)),
              ],
            ),
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 12,
              bottom: MediaQuery.of(context).padding.bottom + 12,
            ),
            child: Row(
              children: [
                // Reset
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _reset,
                    icon: const Icon(Icons.refresh_rounded, size: 17),
                    label: const Text('RESET', style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.8, fontSize: 13)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      side: const BorderSide(color: AppColors.border),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                // Send WhatsApp
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _totalQuantity > 0 ? _sendWhatsApp : null,
                    icon: Icon(Icons.chat_rounded, size: 17, color: _totalQuantity > 0 ? Colors.green.shade600 : AppColors.textMuted),
                    label: Text(
                      'SEND',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                        fontSize: 13,
                        color: _totalQuantity > 0 ? Colors.green.shade600 : AppColors.textMuted,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: _totalQuantity > 0 ? Colors.green.shade400 : AppColors.border),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                // Submit order (only if logged in)
                if (widget.party != null) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _totalQuantity > 0 && !_sending ? _submitOrder : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: _sending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('ORDER', style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.8, fontSize: 13)),
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
      margin: const EdgeInsets.symmetric(vertical: 3, horizontal: 4),
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
          _RoundButton(
            icon: Icons.remove,
            color: AppColors.error,
            onTap: onDecrement,
          ),
          const SizedBox(width: 3),
          _RoundButton(
            icon: Icons.add,
            color: AppColors.success,
            onTap: onIncrement,
          ),
        ],
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _RoundButton({required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 26,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color.withValues(alpha: 0.4), width: 1.5),
        ),
        child: Icon(icon, size: 15, color: color),
      ),
    );
  }
}
