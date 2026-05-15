const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

function extract() {
  const filePath = path.join(__dirname, 'Group_PMCAT_MCAT_Hierarchy.xlsx');
  const outPath = path.join(__dirname, 'public', 'mcat_hierarchy.json');

  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const mapping = {};

  // Find exact keys in case there's whitespace
  let mcatKey = 'MCAT Name';
  let pmcatKey = 'PMCAT Name';
  let groupKey = 'Group Name';

  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    mcatKey = keys.find(k => k.trim().toLowerCase() === 'mcat name') || mcatKey;
    pmcatKey = keys.find(k => k.trim().toLowerCase() === 'pmcat name') || pmcatKey;
    groupKey = keys.find(k => k.trim().toLowerCase() === 'group name') || groupKey;
  }

  let currentGroup = 'Unknown Group';
  let currentPmcat = 'Unknown PMCAT';

  data.forEach(row => {
    let group = row[groupKey];
    let pmcat = row[pmcatKey];
    let mcat = row[mcatKey];

    // Some rows might be arrays if sheet_to_json is used with header: 1
    // But since we are doing defval: '', it's an object if we didn't pass header: 1
    // Actually the previous script didn't use header: 1, so row is an object.
    
    if (group && group.toString().trim() !== '') {
      currentGroup = group.toString().trim();
    }
    
    if (pmcat && pmcat.toString().trim() !== '') {
      currentPmcat = pmcat.toString().trim();
    }

    if (mcat && mcat.toString().trim() !== '') {
      mapping[mcat.toString().trim().toLowerCase()] = {
        pmcat: currentPmcat,
        group: currentGroup
      };
    }
  });

  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2));
  console.log(`Successfully wrote ${Object.keys(mapping).length} MCAT mappings to ${outPath}`);
}

extract();
