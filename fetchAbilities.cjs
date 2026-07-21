const fs = require('fs');

async function main() {
  console.log('Fetching abilities list...');
  const res = await fetch('https://pokeapi.co/api/v2/ability?limit=400');
  const data = await res.json();
  const urls = data.results.map(r => r.url);
  
  const abilityMap = {}; // "흙먹기": { name: "흙먹기", flavor: "...", en: "earth-eater" }
  
  console.log(`Fetching details for ${urls.length} abilities...`);
  const chunkSize = 50;
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async url => {
      try {
        const r = await fetch(url);
        const d = await r.json();
        
        const koNameEntry = d.names.find(n => n.language.name === 'ko');
        const koFlavorEntry = d.flavor_text_entries.find(f => f.language.name === 'ko');
        
        if (koNameEntry) {
          abilityMap[koNameEntry.name] = {
            name: koNameEntry.name,
            flavor: koFlavorEntry ? koFlavorEntry.flavor_text.replace(/\n|\f/g, ' ') : '',
            en: d.name
          };
        }
      } catch(e) {
        // ignore
      }
    }));
    console.log(`Fetched ${Math.min(i + chunkSize, urls.length)} / ${urls.length}`);
  }
  
  fs.writeFileSync('./src/data/abilitiesKo.json', JSON.stringify(abilityMap, null, 2));
  console.log('Done! Saved to src/data/abilitiesKo.json');
}

main();
