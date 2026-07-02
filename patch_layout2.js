import fs from 'fs';
let code = fs.readFileSync('src/components/PartyDashboard.jsx', 'utf8');

const oldLeadInfo = (scoreLabel) => `                    <div className="lead-info" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '8px' }}>
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

const newLeadInfo = (scoreLabel) => `                    <div className="lead-info" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '0 0 95px' }}>
                        <strong style={{ fontSize: '0.95rem', lineHeight: '1.2' }}>{getPokemonKo(lead.pokemon.name)}</strong>
                        <div className="lead-score" style={{ marginTop: 0, fontSize: '0.75rem' }}>${scoreLabel}: {lead.score.toFixed(1)}</div>
                      </div>
                      {lead.roles && lead.roles.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 'min-content', gap: '4px', flex: 1 }}>
                          {lead.roles.map((role, rIdx) => (
                            <span key={rIdx} style={{ 
                              fontSize: '0.65rem', 
                              background: role.color || 'var(--primary-color)', 
                              color: 'white', 
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
                          ))}
                        </div>
                      )}
                    </div>`;

// Replace Left column (선출 지수)
let newCode = code.replace(oldLeadInfo('선출 지수'), newLeadInfo('선출 지수'));
// Replace Right column (선발 지수)
newCode = newCode.replace(oldLeadInfo('선발 지수'), newLeadInfo('선발 지수'));

fs.writeFileSync('src/components/PartyDashboard.jsx', newCode);
console.log("Patched layout2 successfully");
