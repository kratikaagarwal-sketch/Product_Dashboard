const xlsx = require('xlsx');
const fs = require('fs');

console.log('Reading Excel file...');
const workbook = xlsx.readFile('./Git_input_combine.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet);
console.log(`Parsed ${data.length} rows.`);

const hierarchy = {};

data.forEach(row => {
  const group = row['Group Name'];
  const pmcat = row['Pmcat Name'];
  const mcat = row['Mcat Name'];

  // Ignore rows with blank critical fields
  if (!group || !pmcat || !mcat) return;

  const groupName = group.toString().trim();
  const pmcatName = pmcat.toString().trim();
  const mcatName = mcat.toString().trim();

  if (!hierarchy[groupName]) {
    hierarchy[groupName] = {};
  }

  if (!hierarchy[groupName][pmcatName]) {
    hierarchy[groupName][pmcatName] = new Set();
  }

  hierarchy[groupName][pmcatName].add(mcatName);
});

// Convert Sets back to Arrays and sort
const finalHierarchy = {};
Object.keys(hierarchy).sort().forEach(group => {
  finalHierarchy[group] = {};
  Object.keys(hierarchy[group]).sort().forEach(pmcat => {
    finalHierarchy[group][pmcat] = Array.from(hierarchy[group][pmcat]).sort();
  });
});

console.log('Hierarchy built successfully.');

fs.writeFileSync('./src/lib/hierarchy.json', JSON.stringify(finalHierarchy, null, 2));
console.log('Saved to src/lib/hierarchy.json');
