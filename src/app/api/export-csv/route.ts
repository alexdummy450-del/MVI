import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM

  if (!month) {
    return new NextResponse('Missing month parameter', { status: 400 });
  }

  try {
    const supabase = createClient();
    
    // Ensure only admins can export bulk reports
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Filter accidents by month
    const startDate = new Date(`${month}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const { data: accidents, error } = await supabase
      .from('accidents')
      .select(`
        id, occurred_at, location_text, nature, traffic_base,
        primary_vehicle:vehicles!accidents_primary_vehicle_id_fkey(plate_number),
        created_by_profile:profiles!accidents_created_by_fkey(full_name),
        inspections(vt_number),
        reports(status)
      `)
      .gte('occurred_at', startDate.toISOString())
      .lt('occurred_at', endDate.toISOString())
      .order('occurred_at', { ascending: true });

    if (error) throw error;
    
    if (!accidents || accidents.length === 0) {
      return new NextResponse('No accidents found for this month', { status: 404 });
    }

    // Generate CSV
    const headers = [
      "Case ID", 
      "Date", 
      "Time", 
      "Location", 
      "Traffic Base", 
      "Nature", 
      "Primary Plate", 
      "VT Numbers", 
      "Inspector", 
      "Report Status"
    ];

    const rows = accidents.map((a: any) => {
      const d = new Date(a.occurred_at);
      const dateStr = d.toLocaleDateString();
      const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const vtNumbers = a.inspections?.map((i: any) => i.vt_number).join(', ') || 'None';
      const status = a.reports?.[0]?.status || 'No Report';
      
      return [
        a.id.slice(0, 8).toUpperCase(),
        dateStr,
        timeStr,
        `"${(a.location_text || '').replace(/"/g, '""')}"`,
        `"${(a.traffic_base || '').replace(/"/g, '""')}"`,
        a.nature,
        a.primary_vehicle?.plate_number || 'Unknown',
        `"${vtNumbers}"`,
        `"${(a.created_by_profile?.full_name || 'Unknown').replace(/"/g, '""')}"`,
        status
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=Accidents_Summary_${month}.csv`,
      },
    });
  } catch (error: any) {
    console.error(error);
    return new NextResponse('Error generating CSV: ' + error.message, { status: 500 });
  }
}
