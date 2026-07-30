import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDocxBuffer } from '@/lib/docx-generator';
import JSZip from 'jszip';

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

    const { data: accidents } = await supabase
      .from('accidents')
      .select('id, occurred_at')
      .gte('occurred_at', startDate.toISOString())
      .lt('occurred_at', endDate.toISOString());

    if (!accidents || accidents.length === 0) {
      return new NextResponse('No accidents found for this month', { status: 404 });
    }

    const zip = new JSZip();

    for (const accident of accidents) {
      try {
        const docxBuffer = await generateDocxBuffer(supabase, accident.id);
        const fileName = `Report_${accident.id.slice(0, 8).toUpperCase()}.docx`;
        zip.file(fileName, docxBuffer);
      } catch (err) {
        console.error(`Failed to generate docx for ${accident.id}:`, err);
        // Continue generating others even if one fails
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=Monthly_Reports_${month}.zip`,
      },
    });
  } catch (error: any) {
    console.error(error);
    return new NextResponse('Error generating zip: ' + error.message, { status: 500 });
  }
}
