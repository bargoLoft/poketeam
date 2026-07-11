import fs from 'fs';
let code = fs.readFileSync('src/components/OpponentPanel.jsx', 'utf8');

if (!code.includes("import { getPokemonKo }")) {
  code = code.replace(
    /import PokemonCard from '.\/PokemonCard';/,
    `import PokemonCard from './PokemonCard';\nimport { getPokemonKo } from '../data/pokemonNamesKo';`
  );
}

const searchLogic = `  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState('');
  const itemsPerPage = 40;
  
  const filteredList = React.useMemo(() => {
    if (!searchQuery) return pokemonList;
    const lowerQuery = searchQuery.toLowerCase();
    return pokemonList.filter(p => {
      const koName = getPokemonKo(p.name) || '';
      return koName.includes(lowerQuery) || p.name.toLowerCase().includes(lowerQuery);
    });
  }, [pokemonList, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Slice pokemonList for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentList = filteredList.slice(startIndex, startIndex + itemsPerPage);`;

code = code.replace(
  /  const \[currentPage, setCurrentPage\] = React\.useState\(1\);\n  const itemsPerPage = 40;\n  const totalPages = 6;\n  \n  \/\/ Slice pokemonList for current page\n  const startIndex = \(currentPage - 1\) \* itemsPerPage;\n  const currentList = pokemonList\.slice\(startIndex, startIndex \+ itemsPerPage\);/g,
  searchLogic
);

const searchUI = `<div className="opponent-picker__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 className="opponent-picker__title">
                  {searchQuery ? '검색 결과' : \`TOP \${startIndex + 1} - \${Math.min(startIndex + itemsPerPage, filteredList.length)}\`}
                </h3>
                <input 
                  type="text" 
                  placeholder="포켓몬 검색..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.5)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    width: '120px'
                  }}
                />
              </div>`;

code = code.replace(
  /<div className="opponent-picker__header">\s*<h3 className="opponent-picker__title">TOP \{startIndex \+ 1\} - \{startIndex \+ currentList\.length\}<\/h3>/g,
  searchUI
);

fs.writeFileSync('src/components/OpponentPanel.jsx', code);
