import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/lookup-user
 *
 * Server-side user lookup using Supabase RPC functions (SECURITY DEFINER).
 * These functions bypass RLS to search the profiles table without needing
 * the service role key.
 *
 * Prerequisite: Run scripts/setup_user_lookup.sql in the Supabase SQL Editor.
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(
      supabaseUrl,
      serviceKey || anonKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();

    // ── Mode 1: Exact email lookup (for sharing) ──
    if (body.email) {
      const cleanEmail = body.email.trim().toLowerCase();
      console.log('[lookup-user] exact lookup for:', cleanEmail);

      // Try RPC function first (works with anon key via SECURITY DEFINER)
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('lookup_user_by_email', { lookup_email: cleanEmail });

      console.log('[lookup-user] RPC result:', { rpcResult, rpcError: rpcError?.message });

      if (!rpcError && rpcResult && rpcResult.length > 0) {
        return NextResponse.json({ user: { id: rpcResult[0].id, email: rpcResult[0].email } });
      }

      // Fallback: admin API (if service key is available)
      if (serviceKey) {
        console.log('[lookup-user] trying admin API fallback');
        const { data: authData } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (authData) {
          const users = authData.users as { id: string; email?: string }[];
          console.log('[lookup-user] admin API returned', users.length, 'users');
          const match = users.find(u => u.email?.toLowerCase() === cleanEmail);

          if (match) {
            await supabase
              .from('profiles')
              .upsert({ id: match.id, email: match.email }, { onConflict: 'id', ignoreDuplicates: false });

            return NextResponse.json({ user: { id: match.id, email: match.email } });
          }
        }
      } else {
        console.log('[lookup-user] no service key, skipping admin API');
      }

      // Fallback: direct profiles query (works if RLS allows or service key)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', cleanEmail)
        .maybeSingle();

      console.log('[lookup-user] profiles query:', { profile, profileError: profileError?.message });

      if (profile) {
        return NextResponse.json({ user: { id: profile.id, email: profile.email } });
      }

      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── Mode 2: Partial search (for autocomplete) ──
    if (body.search && body.search.length >= 2) {
      const searchTerm = body.search.trim().toLowerCase();
      console.log('[lookup-user] search for:', searchTerm);

      // Try RPC function first
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('search_users_by_email', {
          search_term: searchTerm,
          exclude_user_id: body.excludeUserId || null,
        });

      console.log('[lookup-user] search RPC result:', { rpcResult, rpcError: rpcError?.message });

      if (!rpcError && rpcResult && rpcResult.length > 0) {
        const suggestions = rpcResult.map((r: { email: string }) => r.email);
        return NextResponse.json({ suggestions });
      }

      // Fallback: admin API
      if (serviceKey) {
        const { data: authData } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (authData) {
          const users = authData.users as { id: string; email?: string }[];
          const suggestions = users
            .filter(u => {
              if (!u.email) return false;
              if (body.excludeUserId && u.id === body.excludeUserId) return false;
              return u.email.toLowerCase().includes(searchTerm);
            })
            .map(u => u.email!)
            .slice(0, 5);

          if (suggestions.length > 0) {
            return NextResponse.json({ suggestions });
          }
        }
      }

      // Fallback: direct profiles query
      let query = supabase
        .from('profiles')
        .select('email')
        .ilike('email', `%${searchTerm}%`)
        .not('email', 'is', null)
        .limit(5);

      if (body.excludeUserId) {
        query = query.neq('id', body.excludeUserId);
      }

      const { data } = await query;
      const suggestions = (data ?? []).map(p => p.email).filter(Boolean);

      return NextResponse.json({ suggestions });
    }

    return NextResponse.json(
      { error: 'Provide "email" or "search" in request body' },
      { status: 400 }
    );
  } catch (err) {
    console.error('lookup-user exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
