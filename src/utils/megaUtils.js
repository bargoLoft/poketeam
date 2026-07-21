// Mapping for type strings to Title Case
const typeMap = {
  normal: 'Normal', fighting: 'Fighting', flying: 'Flying', poison: 'Poison',
  ground: 'Ground', rock: 'Rock', bug: 'Bug', ghost: 'Ghost', steel: 'Steel',
  fire: 'Fire', water: 'Water', grass: 'Grass', electric: 'Electric',
  psychic: 'Psychic', ice: 'Ice', dragon: 'Dragon', dark: 'Dark', fairy: 'Fairy'
};

// Dictionary defining available Mega forms for each Pokémon.
// If a Pokémon has 'x' and 'y', they will have two buttons.
export const megaForms = {
  'Venusaur': ['mega'],
  'Charizard': ['x', 'y'],
  'Blastoise': ['mega'],
  'Beedrill': ['mega'],
  'Pidgeot': ['mega'],
  'Raichu': ['x', 'y'],
  'Clefable': ['mega'],
  'Alakazam': ['mega'],
  'Victreebel': ['mega'],
  'Slowbro': ['mega'],
  'Gengar': ['mega'],
  'Kangaskhan': ['mega'],
  'Starmie': ['mega'],
  'Pinsir': ['mega'],
  'Gyarados': ['mega'],
  'Aerodactyl': ['mega'],
  'Dragonite': ['mega'],
  'Meganium': ['mega'],
  'Feraligatr': ['mega'],
  'Ampharos': ['mega'],
  'Steelix': ['mega'],
  'Scizor': ['mega'],
  'Heracross': ['mega'],
  'Skarmory': ['mega'],
  'Houndoom': ['mega'],
  'Tyranitar': ['mega'],
  'Sceptile': ['mega'],
  'Blaziken': ['mega'],
  'Swampert': ['mega'],
  'Gardevoir': ['mega'],
  'Sableye': ['mega'],
  'Mawile': ['mega'],
  'Aggron': ['mega'],
  'Medicham': ['mega'],
  'Manectric': ['mega'],
  'Sharpedo': ['mega'],
  'Camerupt': ['mega'],
  'Altaria': ['mega'],
  'Banette': ['mega'],
  'Chimecho': ['mega'],
  'Absol': ['mega'],
  'Glalie': ['mega'],
  'Metagross': ['mega'],
  'Staraptor': ['mega'],
  'Lopunny': ['mega'],
  'Garchomp': ['mega'],
  'Lucario': ['mega'],
  'Abomasnow': ['mega'],
  'Gallade': ['mega'],
  'Froslass': ['mega'],
  'Emboar': ['mega'],
  'Excadrill': ['mega'],
  'Audino': ['mega'],
  'Scolipede': ['mega'],
  'Scrafty': ['mega'],
  'Eelektross': ['mega'],
  'Chandelure': ['mega'],
  'Golurk': ['mega'],
  'Chesnaught': ['mega'],
  'Delphox': ['mega'],
  'Greninja': ['mega'],
  'Pyroar': ['mega'],
  'Floette': ['mega'],
  'Meowstic': ['mega'],
  'Malamar': ['mega'],
  'Barbaracle': ['mega'],
  'Dragalge': ['mega'],
  'Hawlucha': ['mega'],
  'Crabominable': ['mega'],
  'Falinks': ['mega'],
  'Drampa': ['mega'],
  'Scovillain': ['mega'],
  'Glimmora': ['mega'],
};

// Custom Database for M-B Season Megas (Fallback/Override)
// Add placeholder stats. User can update these later.
const customMegasData = {
  'staraptor-mega': {
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/398.png', // Placeholder (regular Staraptor)
    types: ['Fighting', 'Flying'],
    baseStats: { hp: 85, attack: 140, defense: 85, sp_attack: 50, sp_defense: 75, speed: 120 } // Example boosts
  },
  'raichu-x': {
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/26.png', 
    types: ['Electric', 'Fighting'],
    baseStats: { hp: 60, attack: 130, defense: 65, sp_attack: 90, sp_defense: 90, speed: 130 },
    moves: ['볼트태클', '속이다', '깨뜨리다', '번개펀치', '와일드볼트', '볼부비부비', '치근거리기', '전광석화']
  },
  'raichu-y': {
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/26.png', 
    types: ['Electric', 'Fairy'],
    baseStats: { hp: 60, attack: 90, defense: 65, sp_attack: 130, sp_defense: 90, speed: 130 }
  }
};

const megaCache = {};

export function getMegaDataSync(baseName, form = 'mega') {
  const cacheKey = `${baseName}-${form}`;
  return megaCache[cacheKey] || null;
}

export function getMegaStoneUrl(pokemonName, form) {
  const nameMap = {
    'Venusaur': 'venusaurite',
    'Charizard': form === 'x' ? 'charizardite-x' : 'charizardite-y',
    'Blastoise': 'blastoisinite',
    'Beedrill': 'beedrillite',
    'Pidgeot': 'pidgeotite',
    'Alakazam': 'alakazite',
    'Slowbro': 'slowbronite',
    'Gengar': 'gengarite',
    'Kangaskhan': 'kangaskhanite',
    'Pinsir': 'pinsirite',
    'Gyarados': 'gyaradosite',
    'Aerodactyl': 'aerodactylite',
    'Mewtwo': form === 'x' ? 'mewtwonite-x' : 'mewtwonite-y',
    'Ampharos': 'ampharosite',
    'Steelix': 'steelixite',
    'Scizor': 'scizorite',
    'Heracross': 'heracronite',
    'Houndoom': 'houndoominite',
    'Tyranitar': 'tyranitarite',
    'Sceptile': 'sceptilite',
    'Blaziken': 'blazikenite',
    'Swampert': 'swampertite',
    'Gardevoir': 'gardevoirite',
    'Sableye': 'sablenite',
    'Mawile': 'mawilite',
    'Aggron': 'aggronite',
    'Medicham': 'medichamite',
    'Manectric': 'manectite',
    'Sharpedo': 'sharpedonite',
    'Camerupt': 'cameruptite',
    'Altaria': 'altarianite',
    'Banette': 'banettite',
    'Absol': 'absolite',
    'Glalie': 'glalitite',
    'Salamence': 'salamencite',
    'Metagross': 'metagrossite',
    'Latias': 'latiasite',
    'Latios': 'latiosite',
    'Rayquaza': 'meteorite', // Technically Mega evolves via Dragon Ascent, but visual fallback
    'Lopunny': 'lopunnite',
    'Garchomp': 'garchompite',
    'Lucario': 'lucarionite',
    'Abomasnow': 'abomasite',
    'Gallade': 'galladite',
    'Audino': 'audinite',
    'Diancie': 'diancite',
    'Froslass': 'froslassite',
    'Machamp': 'machampite',
    'Kingler': 'kinglerite',
    'Lapras': 'laprasite',
    'Snorlax': 'snorlaxite',
    'Garbodor': 'garbodorite',
    'Butterfree': 'butterfrite',
    'Corviknight': 'corviknite',
    'Orbeetle': 'orbeetlite',
    'Drednaw': 'drednawite',
    'Coalossal': 'coalossalite',
    'Flapple': 'flapplite',
    'Appletun': 'appletunite',
    'Sandaconda': 'sandacondite',
    'Centiskorch': 'centiskorchite',
    'Hatterene': 'hatterenite',
    'Grimmsnarl': 'grimmsnarlite',
    'Alcremie': 'alcremite',
    'Copperajah': 'copperajahite',
    'Duraludon': 'duraludonite',
    'Glimmora': 'glimmoranite',
  };

  const itemPath = nameMap[pokemonName];
  if (itemPath) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemPath}.png`;
  }

  // Fallback to generic generic mega stone (the image the user wants, but we use the API's generic key stone for visual consistency, or just generic mega ring)
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/key-stone.png';
}

import { apiService } from '../services/apiService';

// Fetch specific mega form (e.g., 'mega', 'x', 'y')
export async function fetchMegaData(baseName, form = 'mega') {
  const cacheKey = `${baseName}-${form}`;
  if (megaCache[cacheKey]) return megaCache[cacheKey];

  // Map the form string to PokeAPI suffix format
  let suffix = '-mega';
  if (form === 'x') suffix = '-mega-x';
  if (form === 'y') suffix = '-mega-y';

  const queryName = baseName.toLowerCase() + suffix;

  // Check custom database first
  if (customMegasData[queryName]) {
    megaCache[cacheKey] = customMegasData[queryName];
    return customMegasData[queryName];
  }

  // Check PokeChamp metadata API first for custom ZA megas (like Mega Starmie)
  try {
    const metaData = await apiService.fetchMetadata(baseName);
    if (metaData && metaData.rows) {
      // Find row matching the mega form
      const megaRow = metaData.rows.find(r => {
        if (!r.form || r.form === '') return false;
        const f = r.form.toLowerCase();
        if (form === 'x' && (f === 'mega x' || f === 'megax' || r.saved_name.toLowerCase().endsWith('x'))) return true;
        if (form === 'y' && (f === 'mega y' || f === 'megay' || r.saved_name.toLowerCase().endsWith('y'))) return true;
        if (form === 'mega' && f === 'mega') return true;
        return false;
      });

      if (megaRow) {
        // API provides level 50 stats at 0 EVs, 31 IVs. Reverse calculate base stats.
        const baseHp = Math.round(((megaRow.hp - 60) * 2 - 31) / 2);
        const calcBaseOther = (stat) => Math.round(((stat - 5) * 2 - 31) / 2);
        
        let abilityEng = (megaRow.abilities || '').split('|')[0].toLowerCase().replace(/ /g, '-');
        
        let spriteUrl = '';
        if (megaRow.image_path) {
          const formattedPath = megaRow.image_path.replace(/\\/g, '/');
          spriteUrl = `https://championsbattledata.com/${formattedPath}`;
        }

        const result = {
          spriteUrl,
          types: (megaRow.types || '').split('/').map(t => t.trim()),
          baseStats: {
            hp: baseHp,
            attack: calcBaseOther(megaRow.atk),
            defense: calcBaseOther(megaRow.def),
            sp_attack: calcBaseOther(megaRow.spa),
            sp_defense: calcBaseOther(megaRow.spd),
            speed: calcBaseOther(megaRow.spe)
          },
          abilityEng
        };
        
        megaCache[cacheKey] = result;
        return result;
      }
    }
  } catch (err) {
    console.error('Failed to fetch mega metadata from PokeChamp API', err);
  }

  // Fallback to PokeAPI
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${queryName}`);
    if (!response.ok) throw new Error('Mega not found');
    const data = await response.json();
    
    const result = {
      spriteUrl: data.sprites.front_default || data.sprites.other['official-artwork'].front_default,
      types: data.types.map(t => typeMap[t.type.name] || t.type.name),
      baseStats: {
        hp: data.stats.find(s => s.stat.name === 'hp').base_stat,
        attack: data.stats.find(s => s.stat.name === 'attack').base_stat,
        defense: data.stats.find(s => s.stat.name === 'defense').base_stat,
        sp_attack: data.stats.find(s => s.stat.name === 'special-attack').base_stat,
        sp_defense: data.stats.find(s => s.stat.name === 'special-defense').base_stat,
        speed: data.stats.find(s => s.stat.name === 'speed').base_stat,
      },
      abilityEng: data.abilities[0]?.ability?.name || null
    };
    
    megaCache[cacheKey] = result;
    return result;
  } catch (error) {
    console.error('Error fetching mega data from PokeAPI:', error);
    return null;
  }
}
