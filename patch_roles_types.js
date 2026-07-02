import fs from 'fs';
let code = fs.readFileSync('src/components/PartyDashboard.jsx', 'utf8');

// 1. Update roles logic
const updatedRoles = `
            const addRole = (label, color = 'var(--primary-color)', priority = 99, isItem = false, sprite = null) => {
              if (!roles.some(r => r.label === label && r.isItem === isItem)) roles.push({ label, color, priority, isItem, sprite });
            };
            
            if (row.category === 'move') {
              const moveInfo = {
                'Stealth Rock': { ko: '스텔스록', color: '#B6A136', p: 30 },
                'Spikes': { ko: '압정뿌리기', color: '#E2BF65', p: 30 },
                'Toxic Spikes': { ko: '독압정', color: '#A33EA1', p: 30 },
                'Sticky Web': { ko: '끈적끈적네트', color: '#A6B91A', p: 30 },
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
            } else if (row.category === 'held_item') {
              // Add Items as Images
              let spriteUrl = '';
              if (['Focus Sash'].includes(row.name)) {
                spriteUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/focus-sash.png';
                addRole('기띠', 'transparent', 70, true, spriteUrl);
              }
              if (['Choice Scarf'].includes(row.name)) {
                spriteUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/choice-scarf.png';
                addRole('스카프', 'transparent', 70, true, spriteUrl);
              }
            }
          }
        });
      }
      roles.sort((a, b) => a.priority - b.priority);
      return { pokemon: p, form: megaList[i], score, roles };
    });`;

code = code.replace(
  /const addRole = \([\s\S]*?return \{ pokemon: p, form: megaList\[i\], score, roles \};\n    \}\);/,
  updatedRoles
);

// 2. Update UI for rendering items and types
const renderTypes = (types) => {
  if (!types) return '';
  return `<div style={{ display: 'inline-flex', gap: '2px', marginLeft: '6px', verticalAlign: 'middle', transform: 'translateY(-1px)' }}>
          {${JSON.stringify(types)}.map(t => (
            <div key={t} className={\`type-icon type-\${t.toLowerCase()}\`} style={{ width: '12px', height: '12px', fontSize: '0', borderRadius: '50%' }} title={t}></div>
          ))}
        </div>`;
};

// Left and Right columns use similar newLeadInfo blocks from our previous patches.
// We will replace `<strong style={{ fontSize: '0.95rem', lineHeight: '1.2' }}>{getPokemonKo(lead.pokemon.name)}</strong>`
// with the types version.
code = code.replace(
  /<strong style=\{\{ fontSize: '0.95rem', lineHeight: '1.2' \}\}>\{getPokemonKo\(lead\.pokemon\.name\)\}<\/strong>/g,
  `<strong style={{ fontSize: '0.95rem', lineHeight: '1.2', display: 'flex', alignItems: 'center' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getPokemonKo(lead.pokemon.name)}</span>
                          {lead.pokemon.summary?.types && (
                            <div style={{ display: 'inline-flex', gap: '2px', marginLeft: '4px', flexShrink: 0 }}>
                              {lead.pokemon.summary.types.map(t => (
                                <div key={t} className={\`type-icon type-\${t.toLowerCase()}\`} style={{ width: '14px', height: '14px', fontSize: '0', borderRadius: '50%' }} title={t}></div>
                              ))}
                            </div>
                          )}
                        </strong>`
);

// Replace Badge render logic
const newBadgeRender = `{lead.roles.slice(0, 6).map((role, rIdx) => (
                            role.isItem ? (
                              <div key={rIdx} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '2px' }}>
                                <img src={role.sprite} alt={role.label} style={{ width: '20px', height: '20px', objectFit: 'contain' }} title={role.label} />
                              </div>
                            ) : (
                            <span key={rIdx} style={{ 
                              fontSize: '0.65rem', 
                              background: role.color || 'var(--primary-color)', 
                              color: 'white', 
                              textShadow: '0px 1px 2px rgba(0,0,0,0.8)',
                              padding: '3px 4px', 
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                              {role.label}
                            </span>
                            )
                          ))}`;

code = code.replace(
  /\{lead\.roles\.slice\(0, 6\)\.map\(\(role, rIdx\) => \([\s\S]*?<\/span>\s*\)\)\}/g,
  newBadgeRender
);

fs.writeFileSync('src/components/PartyDashboard.jsx', code);
console.log("Patched roles and UI successfully");
