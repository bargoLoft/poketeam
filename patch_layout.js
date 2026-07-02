import fs from 'fs';
let code = fs.readFileSync('src/components/PartyDashboard.jsx', 'utf8');

// Define the new layout replacement
const newLeadInfo = (scoreLabel) => `                    <div className="lead-info" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '0 0 80px' }}>
                        <strong style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>{getPokemonKo(lead.pokemon.name)}</strong>
                        <div className="lead-score" style={{ marginTop: 0, fontSize: '0.75rem' }}>${scoreLabel}: {lead.score.toFixed(1)}</div>
                      </div>
                      {lead.roles && lead.roles.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', flex: 1 }}>
                          {lead.roles.map((role, rIdx) => (
                            <span key={rIdx} style={{ 
                              fontSize: '0.65rem', 
                              background: role.color || 'var(--primary-color)', 
                              color: 'white', 
                              padding: '2px 4px', 
                              borderRadius: '12px',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {role.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>`;

// Replace Left column (선출 지수)
code = code.replace(
  /<div className="lead-info">[\s\S]*?<div className="lead-score">선출 지수: \{lead\.score\.toFixed\(1\)\}<\/div>\s*<\/div>/,
  newLeadInfo('선출 지수')
);

// Replace Right column (선발 지수)
code = code.replace(
  /<div className="lead-info">[\s\S]*?<div className="lead-score">선발 지수: \{lead\.score\.toFixed\(1\)\}<\/div>\s*<\/div>/,
  newLeadInfo('선발 지수')
);

fs.writeFileSync('src/components/PartyDashboard.jsx', code);
console.log("Patched layout successfully");
