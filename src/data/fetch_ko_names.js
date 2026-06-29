import fs from 'fs';

async function fetchNames() {
  console.log("Fetching index from championsbattledata...");
  const res = await fetch('https://championsbattledata.com/api');
  const data = await res.json();
  const enNames = data.pokemon.map(p => p.name);
  
  const koMap = {};
  console.log(`Found ${enNames.length} pokemon. Fetching Korean names...`);
  
  // We'll use PokeAPI's pokemon-species endpoint, but we have to map the names.
  // Or we can just use a large static map from a reliable source.
  // Actually, fetching 235 items sequentially might be slow. Let's do it in batches.
  // But wait, PokeAPI handles forms differently (e.g. "Aegislash Shield Forme").
}
fetchNames();
