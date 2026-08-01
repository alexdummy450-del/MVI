import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDocxBuffer } from '@/lib/docx-generator';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Missing accident ID', { status: 400 });
  }

  try {
    const supabase = createClient();
    const buf = await generateDocxBuffer(supabase, id);

    return new NextResponse(buf as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=Draft_Report_Case_${id.slice(0, 8).toUpperCase()}.docx`,
      },
    });
  } catch (error: any) {
    console.error(error);
    return new NextResponse('Error generating document: ' + error.message, { status: 500 });
  }
}
