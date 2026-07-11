import fs from 'fs';
let code = fs.readFileSync('src/components/OpponentPanel.jsx', 'utf8');

if (!code.includes("import { getChosung }")) {
  code = code.replace(
    /import \{ getPokemonKo \} from '\.\.\/data\/pokemonNamesKo';/,
    `import { getPokemonKo } from '../data/pokemonNamesKo';\nimport { getChosung } from '../utils/hangul';`
  );
}

const newLogic = `    return pokemonList.filter(p => {
      const koName = getPokemonKo(p.name) || '';
      const koChosung = getChosung(koName);
      return koName.includes(lowerQuery) || p.name.toLowerCase().includes(lowerQuery) || koChosung.includes(lowerQuery);
    });`;

code = code.replace(
  /    return pokemonList\.filter\(p => \{\n      const koName = getPokemonKo\(p\.name\) \|\| '';\n      return koName\.includes\(lowerQuery\) \|\| p\.name\.toLowerCase\(\)\.includes\(lowerQuery\);\n    \}\);/g,
  newLogic
);

fs.writeFileSync('src/components/OpponentPanel.jsx', code);
