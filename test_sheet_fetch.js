async function testFetch() {
  const url = 'https://docs.google.com/spreadsheets/d/1X91YEaBjTEM-pVnrAdsLmKSDavjHaB0_h-CNwJUOb-M/export?format=csv&gid=0';
  const res = await fetch(url);
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Text (first 100 chars):', text.substring(0, 100));
}
testFetch();
