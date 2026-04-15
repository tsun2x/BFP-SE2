/**
 * BFP Incident Report Generator
 * Generates PDF or DOCX from incident report data fetched from the backend.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle } from 'docx';

function fmt(val) {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'string' && val.trim() === '') return 'N/A';
  return String(val);
}

function fmtDate(val) {
  if (!val) return 'N/A';
  try {
    return new Date(val).toLocaleString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return val;
  }
}

function parseTimelineDetails(timeline) {
  const firstEntry =
    (timeline || []).find(
      (item) => String(item?.action_type || '').toLowerCase() === 'initial dispatch',
    ) ||
    (timeline || [])[0] ||
    null;

  const text = String(firstEntry?.details || '');
  return {
    incidentType: text.match(/Incident:\s*([^|]+)/i)?.[1]?.trim() || '',
    location: text.match(/Location:\s*([^|]+)/i)?.[1]?.trim() || '',
    narrative: text.match(/Narrative:\s*(.+)$/i)?.[1]?.trim() || '',
  };
}

function formatCoordinatePair(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'N/A';
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** ─── PDF ─────────────────────────────────────────────────────────── */
export function downloadPDF({ alarm, timeline, report }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header bar
  doc.setFillColor(200, 30, 30);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BUREAU OF FIRE PROTECTION', pageW / 2, 11, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Incident Report', pageW / 2, 19, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Report generated: ${new Date().toLocaleString('en-PH')}`, pageW / 2, 25, { align: 'center' });

  y = 36;
  doc.setTextColor(0, 0, 0);

  const timelineDetails = parseTimelineDetails(timeline);
  const coordinatePair = formatCoordinatePair(alarm?.user_latitude, alarm?.user_longitude);
  const incidentTypeLabel =
    report?.incident_type || alarm?.incident_type || timelineDetails.incidentType || 'N/A';
  const reportedLocationLabel = report?.location || timelineDetails.location || coordinatePair;
  const narrativeLabel = report?.narrative || timelineDetails.narrative || 'N/A';

  // Report No + Status
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Alarm ID: #${fmt(alarm?.alarm_id)}`, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${fmt(alarm?.status)}`, pageW - 14, y, { align: 'right' });
  y += 8;

  // Section: Caller Information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 4, pageW - 28, 7, 'F');
  doc.text('CALLER INFORMATION', 16, y + 1);
  y += 9;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    body: [
      ['Caller Name', fmt(alarm?.caller_full_name)],
      ['Phone Number', fmt(alarm?.caller_phone)],
    ],
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  // Section: Incident Details
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 4, pageW - 28, 7, 'F');
  doc.text('INCIDENT DETAILS', 16, y + 1);
  y += 9;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    body: [
      ['Incident Type', fmt(incidentTypeLabel)],
      ['Reported Location', fmt(reportedLocationLabel)],
      ['Initial Alarm Level', fmt(alarm?.initial_alarm_level)],
      ['Final Alarm Level', fmt(alarm?.current_alarm_level)],
      ['Coordinates', coordinatePair],
      ['Narrative', fmt(narrativeLabel)],
    ],
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  // Section: Response Information
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 4, pageW - 28, 7, 'F');
  doc.text('RESPONSE INFORMATION', 16, y + 1);
  y += 9;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    body: [
      ['Responding Station', fmt(alarm?.station_name)],
      ['Station Address', fmt(alarm?.station_address)],
      ['Station Contact', fmt(alarm?.station_contact)],
      ['Truck Deployed', fmt(alarm?.truck_plate)],
      ['Call Received', fmtDate(alarm?.call_time)],
      ['Dispatched At', fmtDate(alarm?.dispatch_time)],
      ['Resolved At', fmtDate(alarm?.resolve_time)],
    ],
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  // Section: Casualties & Damage
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 4, pageW - 28, 7, 'F');
  doc.text('CASUALTIES & DAMAGE', 16, y + 1);
  y += 9;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    body: [
      ['Injuries Reported', fmt(report?.injuries_reported ?? 'N/A')],
      ['Deaths Reported', fmt(report?.deaths_reported ?? 'N/A')],
      ['Property Affected', fmt(report?.property_affected)],
    ],
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  // Section: Response Timeline
  if (timeline && timeline.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 4, pageW - 28, 7, 'F');
    doc.text('RESPONSE TIMELINE', 16, y + 1);
    y += 9;

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [200, 30, 30], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      head: [['Timestamp', 'Action', 'Details']],
      body: timeline.map((t) => [
        fmtDate(t.action_timestamp),
        fmt(t.action_type),
        fmt(t.details),
      ]),
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Section: Submitted by
  if (report?.submitter_name || report?.submitted_at) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Report submitted by: ${fmt(report?.submitter_name)} on ${fmtDate(report?.submitted_at)}`,
      14, y
    );
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Bureau of Fire Protection — Official Incident Report', pageW / 2, 290, { align: 'center' });

  doc.save(`BFP_Incident_Report_${alarm?.alarm_id || 'unknown'}.pdf`);
}

/** ─── DOCX ────────────────────────────────────────────────────────── */
export async function downloadDOCX({ alarm, timeline, report }) {
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0 },
    bottom: { style: BorderStyle.NONE, size: 0 },
    left: { style: BorderStyle.NONE, size: 0 },
    right: { style: BorderStyle.NONE, size: 0 },
  };

  function labelValueRow(label, value) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 65, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: fmt(value), size: 20 })] })],
        }),
      ],
    });
  }

  function sectionHeading(text) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text, bold: true, color: 'C81E1E', size: 24 })],
      spacing: { before: 200, after: 80 },
    });
  }

  function infoTable(rows) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(([l, v]) => labelValueRow(l, v)),
    });
  }

  const timelineDetails = parseTimelineDetails(timeline);
  const coordinatePair = formatCoordinatePair(alarm?.user_latitude, alarm?.user_longitude);
  const incidentTypeLabel =
    report?.incident_type || alarm?.incident_type || timelineDetails.incidentType || 'N/A';
  const reportedLocationLabel = report?.location || timelineDetails.location || coordinatePair;
  const narrativeLabel = report?.narrative || timelineDetails.narrative || 'N/A';

  const doc = new Document({
    sections: [{
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: 'BUREAU OF FIRE PROTECTION', bold: true, size: 32, color: 'C81E1E' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'Official Incident Report', size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `Generated: ${new Date().toLocaleString('en-PH')}`, size: 18, color: '888888' })],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Alarm ID: #${fmt(alarm?.alarm_id)}    `, bold: true, size: 20 }),
            new TextRun({ text: `Status: ${fmt(alarm?.status)}`, size: 20 }),
          ],
          spacing: { after: 200 },
        }),

        // Caller Info
        sectionHeading('Caller Information'),
        infoTable([
          ['Caller Name', alarm?.caller_full_name],
          ['Phone Number', alarm?.caller_phone],
        ]),

        // Incident Details
        sectionHeading('Incident Details'),
        infoTable([
          ['Incident Type', incidentTypeLabel],
          ['Reported Location', reportedLocationLabel],
          ['Initial Alarm Level', alarm?.initial_alarm_level],
          ['Final Alarm Level', alarm?.current_alarm_level],
          ['Coordinates', coordinatePair],
          ['Narrative', narrativeLabel],
        ]),

        // Response Info
        sectionHeading('Response Information'),
        infoTable([
          ['Responding Station', alarm?.station_name],
          ['Station Address', alarm?.station_address],
          ['Station Contact', alarm?.station_contact],
          ['Truck Deployed', alarm?.truck_plate],
          ['Call Received', fmtDate(alarm?.call_time)],
          ['Dispatched At', fmtDate(alarm?.dispatch_time)],
          ['Resolved At', fmtDate(alarm?.resolve_time)],
        ]),

        // Casualties
        sectionHeading('Casualties & Damage'),
        infoTable([
          ['Injuries Reported', report?.injuries_reported ?? 'N/A'],
          ['Deaths Reported', report?.deaths_reported ?? 'N/A'],
          ['Property Affected', report?.property_affected],
        ]),

        // Timeline
        ...(timeline && timeline.length > 0 ? [
          sectionHeading('Response Timeline'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Timestamp', 'Action', 'Details'].map((h) =>
                  new TableCell({
                    shading: { fill: 'C81E1E' },
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })],
                  })
                ),
              }),
              ...timeline.map((t) =>
                new TableRow({
                  children: [fmtDate(t.action_timestamp), fmt(t.action_type), fmt(t.details)].map((v) =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: v, size: 18 })] })],
                    })
                  ),
                })
              ),
            ],
          }),
        ] : []),

        // Submitted by
        ...(report ? [
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({
              text: `Report submitted by: ${fmt(report?.submitter_name)} on ${fmtDate(report?.submitted_at)}`,
              italics: true, size: 18, color: '888888',
            })],
          }),
        ] : []),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BFP_Incident_Report_${alarm?.alarm_id || 'unknown'}.docx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
}
