export const abilityBoosts = {
  // Direct Stat Modifiers
  '천하장사': { type: 'stat', stat: 'atk', mult: 2.0 },
  '순수한힘': { type: 'stat', stat: 'atk', mult: 2.0 },
  '요가파워': { type: 'stat', stat: 'atk', mult: 2.0 },
  '허슬': { type: 'stat', stat: 'atk', mult: 1.5 }, // Accuracy drops, but attack increases
  
  // Power Multipliers (Move dependent)
  '단단한발톱': { type: 'power', condition: 'contact', mult: 1.3 },
  '철주먹': { type: 'power', condition: 'punch', mult: 1.2 },
  '우격다짐': { type: 'power', condition: 'secondary', mult: 1.3 },
  '강턱': { type: 'power', condition: 'bite', mult: 1.5 },
  '메가런처': { type: 'power', condition: 'pulse', mult: 1.5 },
  '테크니션': { type: 'power', condition: 'power<=60', mult: 1.5 },
  '부자유친': { type: 'power', condition: 'all', mult: 1.25 },
  '독점': { type: 'power', condition: 'type:poison', mult: 1.5 }, // Actually Toxic Boost is Guts but for poison, so stat.
  '날카로운눈': { type: 'none' },
  
  // Type changing and boosting (Skins)
  '스카이스킨': { type: 'skin', newType: 'flying', mult: 1.2 },
  '페어리스킨': { type: 'skin', newType: 'fairy', mult: 1.2 },
  '프리즈스킨': { type: 'skin', newType: 'ice', mult: 1.2 },
  '일렉트릭스킨': { type: 'skin', newType: 'electric', mult: 1.2 },
  
  // STAB boost
  '적응력': { type: 'stab', mult: 2.0 }, // normal STAB is 1.5
  
  // Type specific boost
  '수포': { type: 'power', condition: 'type:water', mult: 2.0 },
  '트랜지스터': { type: 'power', condition: 'type:electric', mult: 1.5 },
  '용의턱': { type: 'power', condition: 'type:dragon', mult: 1.5 },
  '강철술사': { type: 'power', condition: 'type:steel', mult: 1.5 },
  '페어리오라': { type: 'power', condition: 'type:fairy', mult: 1.3 },
  '다크오라': { type: 'power', condition: 'type:dark', mult: 1.3 },
  '심록': { type: 'power', condition: 'type:grass', mult: 1.5 },
  '가뭄': { type: 'power', condition: 'type:fire', mult: 1.5, badge: '☀️ 쾌청' },
  '잔비': { type: 'power', condition: 'type:water', mult: 1.5, badge: '🌧️ 비' },
  '맹화': { type: 'power', condition: 'type:fire', mult: 1.5 },
  '급류': { type: 'power', condition: 'type:water', mult: 1.5 },
  '벌레의알림': { type: 'power', condition: 'type:bug', mult: 1.5 },

  // Guts, Toxic Boost, Flare Boost (Assuming statused for calc)
  '근성': { type: 'stat', stat: 'atk', mult: 1.5 },
  '독폭주': { type: 'stat', stat: 'atk', mult: 1.5 },
  '열폭주': { type: 'stat', stat: 'spa', mult: 1.5 },

  // Weather dependent abilities (Assume active)
  '선파워': { type: 'stat', stat: 'spa', mult: 1.5 },
  '모래의힘': { type: 'power', condition: 'type:rock,ground,steel', mult: 1.3 },
};
