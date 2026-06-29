import fs from 'fs';

async function run() {
  console.log("Fetching champions index...");
  const indexRes = await fetch("https://championsbattledata.com/api");
  const indexData = await indexRes.json();
  const pokemonList = indexData.pokemon.map(p => p.name);
  console.log(`Found ${pokemonList.length} pokemon.`);

  console.log("Fetching korean names from PokeAPI GraphQL...");
  const query = `
    query {
      pokemon_v2_pokemonspeciesname(where: {language_id: {_eq: 3}}) {
        name
        pokemon_v2_pokemonspecy {
          name
        }
      }
    }
  `;

  const gqlRes = await fetch("https://beta.pokeapi.co/graphql/v1beta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const gqlData = await gqlRes.json();
  
  const nameMap = {};
  for (const entry of gqlData.data.pokemon_v2_pokemonspeciesname) {
    const enBase = entry.pokemon_v2_pokemonspecy.name.replace(/-/g, ' ').toLowerCase();
    nameMap[enBase] = entry.name;
  }

  // Also map known forms
  const customMap = {
    "Aegislash Blade Forme": "킬가르도",
    "Aegislash Shield Forme": "킬가르도",
    "Alcremie": "마휘핑",
    "Alolan Golem": "알로라 딱구리",
    "Alolan Muk": "알로라 질뻐기",
    "Alolan Ninetales": "알로라 나인테일",
    "Alolan Persian": "알로라 페르시온",
    "Alolan Raichu": "알로라 라이츄",
    "Amoonguss": "뽀록나",
    "Annihilape": "저승갓숭",
    "Archaludon": "브리두라스",
    "Armarouge": "카르본",
    "Charizard": "리자몽",
    "Mega Charizard X": "메가 리자몽 X",
    "Mega Charizard Y": "메가 리자몽 Y",
    "Garchomp": "한카리아스",
    "Mega Garchomp": "메가 한카리아스",
    "Meowscarada": "마스카나",
    "Mimikyu": "따라큐",
    "Metagross": "메타그로스",
    "Mega Metagross": "메가 메타그로스",
    "Raichu": "라이츄",
    "Mega Raichu X": "메가 라이츄 X",
    "Mega Raichu Y": "메가 라이츄 Y",
    "Paldean Tauros Aqua Breed": "팔데아 켄타로스 (워터)",
    "Paldean Tauros Blaze Breed": "팔데아 켄타로스 (블레이즈)",
    "Paldean Tauros Combat Breed": "팔데아 켄타로스 (컴뱃)",
    "Gholdengo": "타부자고",
    "Farigiraf": "키키링",
    "Dondozo": "어셔러셔",
    "Tatsugiri": "싸리용",
    "Kingambit": "대도각참",
    "Flutter Mane": "날개치는머리",
    "Iron Hands": "무쇠손",
    "Ogerpon": "오거폰",
    "Ogerpon Cornerstone Mask": "오거폰 (주춧돌)",
    "Ogerpon Hearthflame Mask": "오거폰 (화덕)",
    "Ogerpon Wellspring Mask": "오거폰 (우물)",
    "Urshifu Rapid Strike Style": "우라오스 (연격)",
    "Urshifu Single Strike Style": "우라오스 (일격)",
    "Tornadus": "토네로스",
    "Tornadus Therian Forme": "토네로스 (영물)",
    "Thundurus": "볼트로스",
    "Thundurus Therian Forme": "볼트로스 (영물)",
    "Landorus": "랜드로스",
    "Landorus Therian Forme": "랜드로스 (영물)",
    "Enamorus": "러브로스",
    "Enamorus Therian Forme": "러브로스 (영물)",
    "Bloodmoon Ursaluna": "다투곰 (블러드문)",
    "Ursaluna": "다투곰",
    "Hisuian Arcanine": "히스이 윈디",
    "Hisuian Electrode": "히스이 붐볼",
    "Hisuian Typhlosion": "히스이 블레이범",
    "Hisuian Samurott": "히스이 대검귀",
    "Hisuian Lilligant": "히스이 드레디어",
    "Hisuian Zoroark": "히스이 조로아크",
    "Hisuian Braviary": "히스이 워글",
    "Hisuian Sliggoo": "히스이 미끄네일",
    "Hisuian Goodra": "히스이 미끄래곤",
    "Hisuian Avalugg": "히스이 크레베이스",
    "Hisuian Decidueye": "히스이 모크나이퍼",
    "Sceptile": "나무킹",
    "Mega Sceptile": "메가 나무킹",
    "Blaziken": "번치코",
    "Mega Blaziken": "메가 번치코",
    "Swampert": "대짱이",
    "Mega Swampert": "메가 대짱이",
    "Scolipede": "펜드라",
    "Mega Scolipede": "메가 펜드라",
    "Scrafty": "곤율거니",
    "Mega Scrafty": "메가 곤율거니",
    "Eelektross": "저리더프",
    "Mega Eelektross": "메가 저리더프",
    "Malamar": "칼라마네로",
    "Mega Malamar": "메가 칼라마네로",
    "Barbaracle": "거북손데스",
    "Mega Barbaracle": "메가 거북손데스",
    "Dragalge": "드래캄",
    "Mega Dragalge": "메가 드래캄",
    "Falinks": "대여르",
    "Mega Falinks": "메가 대여르",
    "Galarian Articuno": "가라르 프리져",
    "Galarian Zapdos": "가라르 썬더",
    "Galarian Moltres": "가라르 파이어",
    "Galarian Slowbro": "가라르 야도란",
    "Galarian Slowking": "가라르 야도킹",
    "Galarian Weezing": "가라르 또도가스"
  };

  const finalMap = {};
  for (const name of pokemonList) {
    if (customMap[name]) {
      finalMap[name] = customMap[name];
      continue;
    }

    if (name.startsWith("Mega ")) {
      const base = name.replace("Mega ", "").toLowerCase();
      const koBase = nameMap[base];
      finalMap[name] = koBase ? "메가 " + koBase : name;
      continue;
    }

    const baseName = name.split(" ")[0].toLowerCase();
    if (nameMap[baseName]) {
      finalMap[name] = nameMap[baseName];
    } else {
      finalMap[name] = name;
    }
  }

  // Overwrite the JS file
  const code = `// 자동 생성된 포켓몬 한글 이름 매핑 (수동 추가 포함)
export const pokemonNamesKo = ${JSON.stringify(finalMap, null, 2)};

export const getPokemonKo = (enName) => {
  if (!enName) return '';
  return pokemonNamesKo[enName] || enName;
};
`;
  fs.writeFileSync("src/data/pokemonNamesKo.js", code);
  console.log("Updated src/data/pokemonNamesKo.js successfully.");
}

run();
