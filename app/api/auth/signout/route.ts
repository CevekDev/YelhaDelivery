import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Redirige vers la racine — l'utilisateur peut choisir son espace de login.
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
