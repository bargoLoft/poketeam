import fs from 'fs';
let code = fs.readFileSync('src/components/SearchModal.jsx', 'utf8');

if (!code.includes("import { getChosung }")) {
  code = code.replace(
    /import \{ getPokemonKo \} from '\.\.\/data\/pokemonNamesKo';/,
    `import { getPokemonKo } from '../data/pokemonNamesKo';\nimport { getChosung } from '../utils/hangul';`
  );
}

const searchLogic = `      const koName = getPokemonKo(pokemon.name);
      const searchLower = search.toLowerCase();
      const koChosung = getChosung(koName);
      
      const matchesSearch = search === '' || 
        pokemon.name.toLowerCase().includes(searchLower) || 
        koName.includes(searchLower) ||
        koChosung.includes(searchLower);`;

code = code.replace(
  /      const koName = getPokemonKo\(pokemon\.name\);\n      const searchLower = search\.toLowerCase\(\);\n      \n      const matchesSearch = search === '' \|\|\ \n        pokemon\.name\.toLowerCase\(\)\.includes\(searchLower\) \|\|\ \n        koName\.includes\(search\);/g,
  searchLogic
);

fs.writeFileSync('src/components/SearchModal.jsx', code);
