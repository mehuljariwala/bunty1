import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://jcpprvlxbrunmtbalxfh.supabase.co',
  );
  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcHBydmx4YnJ1bm10YmFseGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjgwMzQsImV4cCI6MjA5MDU0NDAzNH0.grXMqb1reW579T0nkwybtW-e3k7AoyitCzbRv4sYh7c',
  );

  static SupabaseClient get client => Supabase.instance.client;
}
