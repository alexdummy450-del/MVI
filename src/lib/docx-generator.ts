import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';

export async function generateDocxBuffer(supabase: any, id: string): Promise<Buffer> {
  // Fetch the current user and their profile to get the signature details
  const { data: { user } } = await supabase.auth.getUser();
  
  let inspectorName = "Unknown Inspector";
  let inspectorTitle = "Motor Vehicle Inspector";
  let inspectorCredentials = "";

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, title, credentials')
      .eq('id', user.id)
      .single();
      
    if (profile) {
      inspectorName = profile.full_name || inspectorName;
      inspectorTitle = profile.title || inspectorTitle;
      inspectorCredentials = profile.credentials || inspectorCredentials;
    }
  }

  // Fetch the accident and report data
  const { data: accident } = await supabase
    .from('accidents')
    .select('*, primary_vehicle:vehicles!accidents_primary_vehicle_id_fkey(plate_number, make, model)')
    .eq('id', id)
    .single();
    
  if (!accident) throw new Error("Accident not found");

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('accident_id', id)
    .maybeSingle();

  const { data: injuryCounts } = await supabase
    .from('report_injury_counts')
    .select('*')
    .eq('report_id', report?.id || '00000000-0000-0000-0000-000000000000');
  
  const getCount = (cat: string, pType: string) => {
    return injuryCounts?.find((c: any) => c.category === cat && c.person_type === pType)?.count || 0;
  };

  const fatalDriver = getCount('fatal', 'driver_rider');
  const fatalPass = getCount('fatal', 'passenger');
  const fatalPed = getCount('fatal', 'pedestrian');
  const fatalTotal = fatalDriver + fatalPass + fatalPed;

  const seriousDriver = getCount('serious', 'driver_rider');
  const seriousPass = getCount('serious', 'passenger');
  const seriousPed = getCount('serious', 'pedestrian');
  const seriousTotal = seriousDriver + seriousPass + seriousPed;

  const slightDriver = getCount('slight', 'driver_rider');
  const slightPass = getCount('slight', 'passenger');
  const slightPed = getCount('slight', 'pedestrian');
  const slightTotal = slightDriver + slightPass + slightPed;

  const totalDriver = fatalDriver + seriousDriver + slightDriver;
  const totalPass = fatalPass + seriousPass + slightPass;
  const totalPed = fatalPed + seriousPed + slightPed;
  const totalVictims = fatalTotal + seriousTotal + slightTotal;

  const { data: reportVehicleDetails } = await supabase
    .from('report_vehicle_details')
    .select('*')
    .eq('report_id', report?.id || '00000000-0000-0000-0000-000000000000');

  const { data: allAvs } = await supabase
    .from('accident_vehicles')
    .select('id, is_primary, vehicle:vehicles(id, plate_number, make, model)')
    .eq('accident_id', id);

  const { data: driverDetails } = await supabase
    .from('report_driver_details')
    .select('*')
    .eq('report_id', report?.id || '00000000-0000-0000-0000-000000000000');

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('accident_id', id);

  const { data: inspections } = await supabase
    .from('inspections')
    .select('vt_number')
    .eq('accident_id', id);
  const vtNumbers = inspections?.map((i: any) => i.vt_number).filter(Boolean).join(', ') || 'PENDING';

  const VEHICLES = (allAvs || []).map((av: any, index: number) => {
    const vDetails = reportVehicleDetails?.find((vd: any) => vd.accident_vehicle_id === av.id);
    const dDetails = driverDetails?.find((dd: any) => dd.accident_vehicle_id === av.id);
    
    const vehicleRecord = Array.isArray(av.vehicle) ? av.vehicle[0] : av.vehicle;
    const photoRecord = photos?.find((p: any) => p.vehicle_id === vehicleRecord?.id);
    
    return {
      INDEX: index + 1,
      VEHICLE_TABLE_NUM: `3.${index + 1}`,
      DRIVER_TABLE_NUM: `8.${index + 1}`,
      REG_NO: vehicleRecord?.plate_number || 'UNKNOWN',
      OWNER_NAME: vDetails?.registered_owner || '',
      SACCO: vDetails?.sacco || '',
      MAKE_MODEL: `${vehicleRecord?.make || ''} ${vehicleRecord?.model || ''}`.trim(),
      DAMAGES: vDetails?.damages || '',
      SPEED_GOV: vDetails?.speed_governor_status || '',
      KS372: vDetails?.ks372_compliance || '',
      INSURANCE: vDetails?.insurance_details || '',
      PRE_ACCIDENT: vDetails?.pre_accident_condition || '',
      
      DRIVER_NAME: dDetails?.driver_name || 'PENDING',
      DRIVER_ID: dDetails?.driver_id_no || 'PENDING',
      DRIVER_DL: dDetails?.driver_dl_no || 'PENDING',
      
      _storagePath: photoRecord?.storage_path || null
    };
  });

  // Resolve images
  for (const v of VEHICLES) {
    if (v._storagePath) {
      const { data: fileData } = await supabase.storage.from('accident-photos').download(v._storagePath);
      (v as any).VEHICLE_PHOTO = fileData ? Buffer.from(await fileData.arrayBuffer()) : null;
    } else {
      (v as any).VEHICLE_PHOTO = null;
    }
  }

  // Keep primary image for backward compatibility
  const primaryVehicle = VEHICLES.find((v: any) => v.REG_NO === accident?.primary_vehicle?.plate_number) || VEHICLES[0];
  const primaryPhotoBuffer = (primaryVehicle as any)?.VEHICLE_PHOTO || null;

  // Load the template from the public folder
  const templatePath = path.join(process.cwd(), 'public', 'Fatal_RTA_Report_Template.docx');
  const content = fs.readFileSync(templatePath, 'binary');

  const zip = new PizZip(content);
  
  const imageOptions = {
    centered: false,
    getImage: (tagValue: any) => {
      return tagValue; // tagValue is the Buffer we pass in the render object
    },
    getSize: () => {
      return [300, 200]; // Fixed size [width, height]
    }
  };
  const imageModule = new ImageModule(imageOptions);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '[', end: ']' },
    modules: [imageModule],
    parser: (tag: string) => ({
      get: (scope: any) => {
        return scope[tag] !== undefined ? scope[tag] : `[${tag}]`;
      }
    })
  });

  const d = accident?.occurred_at ? new Date(accident.occurred_at) : new Date();
  const day = d.getDate();
  const monthName = d.toLocaleString('default', { month: 'long' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  doc.render({
    "STATION / V.I.C NAME": report?.recipient_office || (accident?.traffic_base ? `${accident.traffic_base.toUpperCase()} TRAFFIC BASE` : ''),
    "DAY": day,
    "MONTH": monthName.toUpperCase(),
    "YEAR": year,
    "TRAFFIC BASE": accident?.traffic_base || '',
    "VT NUMBER(S)": vtNumbers,
    "VEHICLE 1 REG NO": accident?.primary_vehicle?.plate_number || 'UNKNOWN',
    "VEHICLE 1 MAKE/TYPE": accident?.primary_vehicle?.make ? `${accident.primary_vehicle.make} ${accident.primary_vehicle.model || ''}` : '',
    "TOWING TRAILER REG NO. IF ANY": 'N/A',
    "ROAD NAME": accident?.location_text || 'UNKNOWN',
    "LOCATION": accident?.location_text || 'UNKNOWN',
    "DATE": d.toLocaleDateString(),
    "TIME": time,
    " ": "X",
    "Describe road condition, carriageway type, lane markings, surface defects, gradient, etc.": report?.road_condition || '',
    "Additional notes on road surface / obstructions": '',
    "Describe traffic conditions at time of crash": report?.traffic_condition || '',
    "Weather condition at time of crash": report?.weather || '',
    "Visibility condition at time of crash": report?.visibility || '',
    "LATITUDE": accident?.latitude || 'N/A',
    "LONGITUDE": accident?.longitude || 'N/A',
    
    // Injury Counts Table
    "FATAL_DRIVER": fatalDriver || '0',
    "FATAL_PASSENGERS": fatalPass || '0',
    "FATAL_PEDESTRIAN": fatalPed || '0',
    "FATAL_TOTAL": fatalTotal || '0',
    "SERIOUS_DRIVER": seriousDriver || '0',
    "SERIOUS_PASSENGERS": seriousPass || '0',
    "SERIOUS_PEDESTRIAN": seriousPed || '0',
    "SERIOUS_TOTAL": seriousTotal || '0',
    "SLIGHT_DRIVER": slightDriver || '0',
    "SLIGHT_PASSENGERS": slightPass || '0',
    "SLIGHT_PEDESTRIAN": slightPed || '0',
    "SLIGHT_TOTAL": slightTotal || '0',
    "TOTAL_DRIVER": totalDriver || '0',
    "TOTAL_PASSENGERS": totalPass || '0',
    "TOTAL_PEDESTRIAN": totalPed || '0',
    "TOTAL_VICTIMS": totalVictims || '0',

    // Vehicles Array for docxtemplater loop
    "VEHICLES": VEHICLES,

    // Primary Vehicle Details (Fallback/Table 3)
    "REGISTERED OWNER NAME": primaryVehicle?.OWNER_NAME || '',
    "SACCO NAME, IF APPLICABLE": primaryVehicle?.SACCO || '',
    "MAKE, MODEL & TYPE": primaryVehicle?.MAKE_MODEL || '',
    "DESCRIBE GENERAL DAMAGES": primaryVehicle?.DAMAGES || '',
    "SPEED GOVERNOR FUNCTIONALITY / N.A": primaryVehicle?.SPEED_GOV || '',
    "KS 372 COMPLIANCE STATUS": primaryVehicle?.KS372 || '',
    "INSURANCE DETAILS / EXPIRY DATE": primaryVehicle?.INSURANCE || '',
    "PRE-ACCIDENT CONDITION / DEFECTS NOTED": primaryVehicle?.PRE_ACCIDENT || '',

    // Standardized Vehicle 1 Tags
    "VEHICLE 1 OWNER NAME": primaryVehicle?.OWNER_NAME || '',
    "VEHICLE 1 SACCO": primaryVehicle?.SACCO || '',
    "VEHICLE 1 MAKE_MODEL": primaryVehicle?.MAKE_MODEL || '',
    "VEHICLE 1 DAMAGES": primaryVehicle?.DAMAGES || '',
    "VEHICLE 1 SPEED_GOV": primaryVehicle?.SPEED_GOV || '',
    "VEHICLE 1 KS372": primaryVehicle?.KS372 || '',
    "VEHICLE 1 INSURANCE": primaryVehicle?.INSURANCE || '',
    "VEHICLE 1 PRE_ACCIDENT": primaryVehicle?.PRE_ACCIDENT || '',
    "VEHICLE 1 DRIVER_NAME": primaryVehicle?.DRIVER_NAME || 'PENDING',
    "VEHICLE 1 DRIVER_ID": primaryVehicle?.DRIVER_ID || 'PENDING',
    "VEHICLE 1 DRIVER_DL": primaryVehicle?.DRIVER_DL || 'PENDING',

    "VEHICLE 2 REG NO": VEHICLES[1]?.REG_NO || 'N/A',
    "VEHICLE 3 REG NO": VEHICLES[2]?.REG_NO || 'N/A',
    "VEHICLE 4 REG NO": VEHICLES[3]?.REG_NO || 'N/A',

    "VEHICLE 2 OWNER NAME": VEHICLES[1]?.OWNER_NAME || '',
    "VEHICLE 2 SACCO": VEHICLES[1]?.SACCO || '',
    "VEHICLE 2 MAKE_MODEL": VEHICLES[1]?.MAKE_MODEL || '',
    "VEHICLE 2 DAMAGES": VEHICLES[1]?.DAMAGES || '',
    "VEHICLE 2 SPEED_GOV": VEHICLES[1]?.SPEED_GOV || '',
    "VEHICLE 2 KS372": VEHICLES[1]?.KS372 || '',
    "VEHICLE 2 INSURANCE": VEHICLES[1]?.INSURANCE || '',
    "VEHICLE 2 PRE_ACCIDENT": VEHICLES[1]?.PRE_ACCIDENT || '',
    "VEHICLE 2 DRIVER_NAME": VEHICLES[1]?.DRIVER_NAME || '',
    "VEHICLE 2 DRIVER_ID": VEHICLES[1]?.DRIVER_ID || '',
    "VEHICLE 2 DRIVER_DL": VEHICLES[1]?.DRIVER_DL || '',

    "VEHICLE 3 OWNER NAME": VEHICLES[2]?.OWNER_NAME || '',
    "VEHICLE 3 SACCO": VEHICLES[2]?.SACCO || '',
    "VEHICLE 3 MAKE_MODEL": VEHICLES[2]?.MAKE_MODEL || '',
    "VEHICLE 3 DAMAGES": VEHICLES[2]?.DAMAGES || '',
    "VEHICLE 3 SPEED_GOV": VEHICLES[2]?.SPEED_GOV || '',
    "VEHICLE 3 KS372": VEHICLES[2]?.KS372 || '',
    "VEHICLE 3 INSURANCE": VEHICLES[2]?.INSURANCE || '',
    "VEHICLE 3 PRE_ACCIDENT": VEHICLES[2]?.PRE_ACCIDENT || '',
    "VEHICLE 3 DRIVER_NAME": VEHICLES[2]?.DRIVER_NAME || '',
    "VEHICLE 3 DRIVER_ID": VEHICLES[2]?.DRIVER_ID || '',
    "VEHICLE 3 DRIVER_DL": VEHICLES[2]?.DRIVER_DL || '',

    "VEHICLE 4 OWNER NAME": VEHICLES[3]?.OWNER_NAME || '',
    "VEHICLE 4 SACCO": VEHICLES[3]?.SACCO || '',
    "VEHICLE 4 MAKE_MODEL": VEHICLES[3]?.MAKE_MODEL || '',
    "VEHICLE 4 DAMAGES": VEHICLES[3]?.DAMAGES || '',
    "VEHICLE 4 SPEED_GOV": VEHICLES[3]?.SPEED_GOV || '',
    "VEHICLE 4 KS372": VEHICLES[3]?.KS372 || '',
    "VEHICLE 4 INSURANCE": VEHICLES[3]?.INSURANCE || '',
    "VEHICLE 4 PRE_ACCIDENT": VEHICLES[3]?.PRE_ACCIDENT || '',
    "VEHICLE 4 DRIVER_NAME": VEHICLES[3]?.DRIVER_NAME || '',
    "VEHICLE 4 DRIVER_ID": VEHICLES[3]?.DRIVER_ID || '',
    "VEHICLE 4 DRIVER_DL": VEHICLES[3]?.DRIVER_DL || '',

    // Primary Driver Details (Fallback/Table 8)
    "DRIVER_NAME": primaryVehicle?.DRIVER_NAME || 'PENDING',
    "DRIVER_ID_NO": primaryVehicle?.DRIVER_ID || 'PENDING',
    "DRIVER_DL_NO": primaryVehicle?.DRIVER_DL || 'PENDING',

    "Provide a detailed narrative reconstruction of the crash: date, time, vehicles involved, direction of travel, sequence of events leading up to the collision, actions of each driver, and how the impact occurred.": report?.reconstruction_narrative || accident?.narrative || '',
    "Continue narrative: describe the point/nature of impact, resulting injuries and fatalities, casualty evacuation details (hospital name), outcome for other parties involved, and post-crash actions such as vehicle recovery and body transfer to mortuary.": report?.point_of_impact || '',
    "Cause code": report?.cause_code || 'Speeding',
    "Case status, e.g. PUI/Closed": "PUI",
    "INSPECTOR'S NAME": inspectorName,
    "QUALIFICATIONS/DESIGNATIONS": inspectorCredentials,
    "TITLE / STATION": `${inspectorTitle} / ${report?.recipient_office || accident?.traffic_base || ''}`,
    "%PRIMARY_VEHICLE_PHOTO": primaryPhotoBuffer,
  });

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  
  return buf;
}
