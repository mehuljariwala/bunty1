import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://gelxlxnfhefyxhikrhib.supabase.co',
  );
  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHhseG5maGVmeXhoaWtyaGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0MzcsImV4cCI6MjA4OTA2MTQzN30.OdCQ1YmMUT9rK52R-m05E-5Q2PAjI_xS1qZmV-zy4vw',
  );

  static SupabaseClient get client => Supabase.instance.client;
}
