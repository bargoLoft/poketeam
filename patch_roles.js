import fs from 'fs';
let code = fs.readFileSync('src/components/PartyDashboard.jsx', 'utf8');

// 1. Change stat_alignment to stat_points for Walls
code = code.replace(
  `} else if (row.category === 'stat_alignment') {
              if (['Bold', 'Impish', 'Relaxed'].includes(row.name)) addRole('물리막이', '#e74c3c');
              if (['Calm', 'Careful', 'Sassy'].includes(row.name)) addRole('특수막이', '#0984e3');`,
  `} else if (row.category === 'stat_points') {
              if (row.defense_points >= 12) addRole('물리내구', '#e74c3c');
              if (row.sp_def_points >= 12) addRole('특수내구', '#0984e3');
            } else if (row.category === 'stat_alignment') {
              if (['Bold', 'Impish', 'Relaxed'].includes(row.name)) addRole('물리막이', '#e74c3c');
              if (['Calm', 'Careful', 'Sassy'].includes(row.name)) addRole('특수막이', '#0984e3');`
);

// 2. Add Setup moves
code = code.replace(
  `if (['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'].includes(row.name)) addRole('장판');`,
  `if (['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'].includes(row.name)) addRole('장판');
              if (['Swords Dance', 'Dragon Dance', 'Nasty Plot', 'Calm Mind', 'Bulk Up', 'Quiver Dance', 'Iron Defense', 'Agility'].includes(row.name)) addRole('랭크업', '#ff4757');`
);

// 3. Remove slice(0, 5)
code = code.replace(
  `roles: roles.slice(0, 5)`,
  `roles`
);

fs.writeFileSync('src/components/PartyDashboard.jsx', code);
console.log("Patched successfully");
