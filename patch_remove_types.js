import fs from 'fs';
let code = fs.readFileSync('src/components/PartyDashboard.jsx', 'utf8');

const targetNameWithTypes = `<strong style={{ fontSize: '0.95rem', lineHeight: '1.2', display: 'flex', alignItems: 'center' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getPokemonKo(lead.pokemon.name)}</span>
                          {lead.pokemon.summary?.types && (
                            <div style={{ display: 'inline-flex', gap: '2px', marginLeft: '4px', flexShrink: 0 }}>
                              {lead.pokemon.summary.types.map(t => (
                                <div key={t} className={\`type-icon type-\${t.toLowerCase()}\`} style={{ width: '14px', height: '14px', fontSize: '0', borderRadius: '50%' }} title={t}></div>
                              ))}
                            </div>
                          )}
                        </strong>`;

const revertName = `<strong style={{ fontSize: '0.95rem', lineHeight: '1.2' }}>{getPokemonKo(lead.pokemon.name)}</strong>`;

code = code.split(targetNameWithTypes).join(revertName);

fs.writeFileSync('src/components/PartyDashboard.jsx', code);
console.log("Patched remove types successfully");
