import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://abvrdmhytinnvgkmnflt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidnJkbWh5dGlubnZna21uZmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODA0MjQsImV4cCI6MjA5MzI1NjQyNH0.jBKFf0kpmQr08CAXiuJkhYFXM-G3xEZ0CZW6vIoPx2E';

export const supabase = createClient(supabaseUrl, supabaseKey);
