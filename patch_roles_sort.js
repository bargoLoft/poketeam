import fs from 'fs';
let code = fs.readFileSync('src/components/PartyDashboard.jsx', 'utf8');

const updatedRoles = `
            const addRole = (label, color = 'var(--primary-color)', priority = 99) => {
              if (!roles.some(r => r.label === label)) roles.push({ label, color, priority });
            };
            
            if (row.category === 'move') {
              if (['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'].includes(row.name)) addRole('장판', '#B6A136', 30);
              const moveInfo = {
                'Swords Dance': { ko: '칼춤', color: '#A8A77A', p: 40 },
                'Dragon Dance': { ko: '용의춤', color: '#6F35FC', p: 40 },
                'Nasty Plot': { ko: '나쁜음모', color: '#705746', p: 40 },
                'Calm Mind': { ko: '명상', color: '#F95587', p: 40 },
                'Bulk Up': { ko: '벌크업', color: '#C22E28', p: 40 },
                'Quiver Dance': { ko: '나비춤', color: '#A6B91A', p: 40 },
                'Iron Defense': { ko: '철벽', color: '#B7B7CE', p: 40 },
                'Agility': { ko: '고속이동', color: '#F95587', p: 40 },
                'Reflect': { ko: '리플렉터', color: '#F95587', p: 35 },
                'Light Screen': { ko: '빛의장막', color: '#F95587', p: 35 },
                'Aurora Veil': { ko: '오로라베일', color: '#96D9D6', p: 35 },
                'U-turn': { ko: '유턴', color: '#A6B91A', p: 60 },
                'Volt Switch': { ko: '볼트체인지', color: '#F7D02C', p: 60 },
                'Parting Shot': { ko: '막말내뱉기', color: '#705746', p: 60 },
                'Flip Turn': { ko: '퀵턴', color: '#6390F0', p: 60 },
                'Fake Out': { ko: '속이다', color: '#A8A77A', p: 55 },
                'Taunt': { ko: '도발', color: '#705746', p: 55 }
              };
              if (moveInfo[row.name]) {
                addRole(moveInfo[row.name].ko, moveInfo[row.name].color, moveInfo[row.name].p);
              }
              if (['Trick Room'].includes(row.name)) addRole('트릭룸', '#8a2be2', 30);
              if (['Tailwind'].includes(row.name)) addRole('순풍', '#00ced1', 30);
              if (['Yawn', 'Spore', 'Sleep Powder', 'Hypnosis'].includes(row.name)) addRole('수면', '#A8A77A', 50);
              
              if (['Sunny Day'].includes(row.name)) addRole('쾌청', '#e67e22', 20);
              if (['Rain Dance'].includes(row.name)) addRole('비바라기', '#3498db', 20);
              if (['Sandstorm'].includes(row.name)) addRole('모래', '#c2b280', 20);
              if (['Snowscape', 'Hail'].includes(row.name)) addRole('설경', '#74b9ff', 20);
              
              if (['Grassy Terrain'].includes(row.name)) addRole('그래스', '#2ecc71', 25);
              if (['Electric Terrain'].includes(row.name)) addRole('일렉트릭', '#f1c40f', 25);
              if (['Psychic Terrain'].includes(row.name)) addRole('사이코', '#9b59b6', 25);
              if (['Misty Terrain'].includes(row.name)) addRole('미스트', '#fd79a8', 25);
            } else if (row.category === 'ability') {
              if (['Drought'].includes(row.name)) addRole('가뭄', '#e67e22', 20);
              if (['Drizzle'].includes(row.name)) addRole('잔비', '#3498db', 20);
              if (['Sand Stream'].includes(row.name)) addRole('모래날림', '#c2b280', 20);
              if (['Snow Warning'].includes(row.name)) addRole('눈퍼뜨리기', '#74b9ff', 20);
              
              if (['Grassy Surge'].includes(row.name)) addRole('그래스', '#2ecc71', 25);
              if (['Electric Surge'].includes(row.name)) addRole('일렉트릭', '#f1c40f', 25);
              if (['Psychic Surge'].includes(row.name)) addRole('사이코', '#9b59b6', 25);
              if (['Misty Surge'].includes(row.name)) addRole('미스트', '#fd79a8', 25);
            } else if (row.category === 'stat_points') {
              if (row.defense_points >= 12) addRole('물리막이', '#e74c3c', 10);
              if (row.sp_def_points >= 12) addRole('특수막이', '#0984e3', 10);
            } else if (row.category === 'stat_alignment') {
              if (['Bold', 'Impish', 'Relaxed'].includes(row.name)) addRole('물리막이', '#e74c3c', 10);
              if (['Calm', 'Careful', 'Sassy'].includes(row.name)) addRole('특수막이', '#0984e3', 10);
            } else if (row.category === 'held_item') {
              if (['Focus Sash'].includes(row.name)) addRole('기띠', '#ff9f43', 70);
              if (['Choice Scarf'].includes(row.name)) addRole('스카프', '#0abde3', 70);
            }
          }
        });
      }
      roles.sort((a, b) => a.priority - b.priority);
      return { pokemon: p, form: megaList[i], score, roles };
    });`;

// Apply the replacement
code = code.replace(
  /const addRole = \([\s\S]*?return \{ pokemon: p, form: megaList\[i\], score, roles \};\n    \}\);/,
  updatedRoles
);

fs.writeFileSync('src/components/PartyDashboard.jsx', code);
console.log("Patched sorting successfully");
