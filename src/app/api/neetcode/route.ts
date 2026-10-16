import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { NeetcodeState } from '@/types/neetcode';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ configured: false, state: null });
  }

  try {
    const { data, error } = await supabase
      .from('neetcode_state')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();

    if (error) {
      console.error('Supabase fetch NeetCode state error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ configured: true, state: data ? data.data : null });
  } catch (error) {
    console.error('Error fetching NeetCode state from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NeetCode state' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ configured: false });
  }

  try {
    const updates = (await request.json()) as Partial<NeetcodeState>;

    // Fetch existing state to merge safely
    const { data: existingRow } = await supabase
      .from('neetcode_state')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();

    const existingData = existingRow?.data || {};
    const mergedData = { ...existingData, ...updates };

    const { error } = await supabase.from('neetcode_state').upsert({
      id: 'main',
      data: mergedData,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase save NeetCode state error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving NeetCode state to Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to save NeetCode state' },
      { status: 500 }
    );
  }
}
