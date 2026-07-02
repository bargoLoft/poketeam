import fs from 'fs';
let code = fs.readFileSync('src/components/PartyDashboard.jsx', 'utf8');

const setupAndScreens = `
              const moveInfo = {
                'Swords Dance': { ko: '칼춤', color: '#A8A77A' },
                'Dragon Dance': { ko: '용의춤', color: '#6F35FC' },
                'Nasty Plot': { ko: '나쁜음모', color: '#705746' },
                'Calm Mind': { ko: '명상', color: '#F95587' },
                'Bulk Up': { ko: '벌크업', color: '#C22E28' },
                'Quiver Dance': { ko: '나비춤', color: '#A6B91A' },
                'Iron Defense': { ko: '철벽', color: '#B7B7CE' },
                'Agility': { ko: '고속이동', color: '#F95587' },
                'Reflect': { ko: '리플렉터', color: '#F95587' },
                'Light Screen': { ko: '빛의장막', color: '#F95587' },
                'Aurora Veil': { ko: '오로라베일', color: '#96D9D6' }
              };
              if (moveInfo[row.name]) {
                addRole(moveInfo[row.name].ko, moveInfo[row.name].color);
              }
`;

// Replace Setup/Screens logic
code = code.replace(
  `if (['Swords Dance', 'Dragon Dance', 'Nasty Plot', 'Calm Mind', 'Bulk Up', 'Quiver Dance', 'Iron Defense', 'Agility'].includes(row.name)) addRole('랭크업', '#ff4757');
              if (['Light Screen', 'Reflect', 'Aurora Veil'].includes(row.name)) addRole('벽깔이');`,
  setupAndScreens.trim()
);

// Merge 물리내구/특수내구 -> 물리막이/특수막이
code = code.replace(
  `if (row.defense_points >= 12) addRole('물리내구', '#e74c3c');
              if (row.sp_def_points >= 12) addRole('특수내구', '#0984e3');`,
  `if (row.defense_points >= 12) addRole('물리막이', '#e74c3c');
              if (row.sp_def_points >= 12) addRole('특수막이', '#0984e3');`
);

fs.writeFileSync('src/components/PartyDashboard.jsx', code);
console.log("Patched successfully");
