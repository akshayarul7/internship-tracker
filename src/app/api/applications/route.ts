import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { Application } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ configured: false, applications: [] });
  }

  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Supabase fetch applications error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ configured: true, applications: data || [] });
  } catch (error) {
    console.error('Error fetching applications from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
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
    const app = (await request.json()) as Application;
    if (!app.id || !app.companyName || !app.role) {
      return NextResponse.json(
        { error: 'Invalid application data' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('applications').upsert({
      id: app.id,
      companyName: app.companyName,
      role: app.role,
      dateApplied: app.dateApplied,
      status: app.status,
      notes: app.notes || null,
      portalLink: app.portalLink || null,
      createdAt: app.createdAt || Date.now(),
    });

    if (error) {
      console.error('Supabase save application error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, application: app });
  } catch (error) {
    console.error('Error saving application to Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to save application' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ configured: false });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing application id' }, { status: 400 });
    }

    const { error } = await supabase.from('applications').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete application error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting application from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ configured: false });
  }

  try {
    const body = await request.json();
    const apps = (body.applications || []) as Application[];

    if (apps.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const payload = apps.map((app) => ({
      id: app.id,
      companyName: app.companyName,
      role: app.role,
      dateApplied: app.dateApplied,
      status: app.status,
      notes: app.notes || null,
      portalLink: app.portalLink || null,
      createdAt: app.createdAt || Date.now(),
    }));

    const { error } = await supabase.from('applications').upsert(payload);
    if (error) {
      console.error('Supabase bulk upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: apps.length });
  } catch (error) {
    console.error('Error bulk updating applications in Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update applications' },
      { status: 500 }
    );
  }
}
