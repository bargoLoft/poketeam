/**
 * Nature translations (English → Korean) and stat modifier maps.
 * Extracted from DetailPanel.jsx to avoid re-creation on every render.
 */

export const natureTranslations = {
  Adamant: '고집', Bashful: '수줍음', Bold: '대담', Brave: '용감',
  Calm: '차분', Careful: '신중', Docile: '온순', Gentle: '얌전',
  Hardy: '노력', Hasty: '성급', Impish: '장난꾸러기', Jolly: '명랑',
  Lax: '렁구', Lonely: '외로움', Mild: '의젓', Modest: '조심',
  Naive: '천진난만', Naughty: '개구쟁이', Quiet: '냉정', Quirky: '변덕',
  Rash: '덜렁', Relaxed: '무사태평', Sassy: '건방', Serious: '성실',
  Timid: '겁쟁이'
};

export const natureStatsMap = {
  Adamant: { up: '공격', down: '특공' },
  Jolly: { up: '스피드', down: '특공' },
  Modest: { up: '특공', down: '공격' },
  Timid: { up: '스피드', down: '공격' },
  Impish: { up: '방어', down: '특공' },
  Careful: { up: '특방', down: '특공' },
  Bold: { up: '방어', down: '공격' },
  Calm: { up: '특방', down: '공격' },
  Brave: { up: '공격', down: '스피드' },
  Quiet: { up: '특공', down: '스피드' },
  Relaxed: { up: '방어', down: '스피드' },
  Sassy: { up: '특방', down: '스피드' },
  Naive: { up: '스피드', down: '특방' },
  Hasty: { up: '스피드', down: '방어' },
  Rash: { up: '특공', down: '특방' },
  Mild: { up: '특공', down: '방어' },
  Naughty: { up: '공격', down: '특방' },
  Lonely: { up: '공격', down: '방어' },
  Lax: { up: '방어', down: '특방' },
  Gentle: { up: '특방', down: '방어' }
};
