import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://isxwcdhagwozmvavlbts.supabase.co', 'sb_publishable_ag2fAQNwcqZYOCi9PKV8Jg_NuiBs7rD');

async function main() {
  const sheetId = '1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU';
  const csvUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/export?format=csv';
  const res = await fetch(csvUrl);
  const csvText = await res.text();

  const lines = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    if (c === '"') { inQ = !inQ; cur += c; }
    else if ((c === '\r' || c === '\n') && !inQ) {
      if (c === '\r' && csvText[i+1] === '\n') i++;
      if (cur.trim().length > 0) lines.push(cur);
      cur = '';
    } else cur += c;
  }
  if (cur.trim().length > 0) lines.push(cur);
  console.log('Total lines in CSV:', lines.length);

  const parseRow = (line) => {
    const cells = [];
    let cell = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i+1] === '"') { cell += '"'; i++; }
        else q = !q;
      } else if (ch === ',' && !q) { cells.push(cell.trim()); cell = ''; }
      else cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  };
  const headers = parseRow(lines[0]);

  let allSb = [];
  let p = 0;
  while (true) {
    const { data } = await sb.from('resources')
      .select('id, google_form_submission_id, google_drive_file_id, title')
      .eq('source_type', 'google_form')
      .range(p * 500, (p + 1) * 500 - 1);
    if (!data || data.length === 0) break;
    allSb.push(...data);
    if (data.length < 500) break;
    p++;
  }

  const sbSubIds = new Set(allSb.map(r => r.google_form_submission_id).filter(Boolean));
  const sbDriveIds = new Set(allSb.map(r => r.google_drive_file_id).filter(Boolean));

  console.log('Existing in Supabase:', allSb.length);

  let matchedCount = 0;
  let unmatchedRows = [];

  for (let i = 1; i < lines.length; i++) {
    const rowVals = parseRow(lines[i]);
    const row = {};
    headers.forEach((h, idx) => row[h] = rowVals[idx] || '');

    const getV = (keys) => {
      for (const k of keys) {
        if (row[k]) return row[k].trim();
        const fk = Object.keys(row).find(x => x.trim().toLowerCase() === k.trim().toLowerCase());
        if (fk && row[fk]) return row[fk].trim();
      }
      return '';
    };

    const title = getV(['Tên tài nguyên', 'Tiêu đề', 'Tên học liệu']);
    const email = getV(['Địa chỉ email', 'Email', 'Email giáo viên']);
    const uploadUrl = getV(['Tải tài liệu lên', 'Đường link', 'Tệp đính kèm']);
    let driveFileId;
    const m = uploadUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || uploadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) driveFileId = m[1];

    const timestamp = getV(['Dấu thời gian', 'Timestamp', 'Thời gian']) || '';
    const safeTime = timestamp.replace(/[^0-9]/g, '_') || `row_${i}`;
    const submissionId = `sheet_1gH6zehW_r${i}_${safeTime}`;

    const hasSubId = sbSubIds.has(submissionId);
    const hasDriveId = driveFileId && sbDriveIds.has(driveFileId);

    if (hasSubId || hasDriveId) {
      matchedCount++;
    } else {
      unmatchedRows.push({ rowIndex: i, title, email, driveFileId, submissionId });
    }
  }

  console.log('Matched in Supabase:', matchedCount);
  console.log('Unmatched rows count:', unmatchedRows.length);
  if (unmatchedRows.length > 0) {
    console.log('Unmatched items:', JSON.stringify(unmatchedRows, null, 2));
  }
}

main().catch(console.error);
