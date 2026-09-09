/* ============================================================
   GIZONA DOCES — conexão com o Supabase
   URL e "anon key" são públicas por natureza (não são senha),
   só funcionam porque as regras de segurança (RLS) estão no banco.
============================================================ */
const SUPABASE_URL = "https://ahhuqlhgeabkujbpgxtc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHVxbGhnZWFia3VqYnBneHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMzg4NjIsImV4cCI6MjEwMTcxNDg2Mn0.XxH-BPNh9KfFomYUVdjBBKq1cP3HUtCtl7nBvvhZzn8";

let sb = null;
try {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error("Não foi possível conectar ao Supabase (biblioteca não carregou):", e);
}
