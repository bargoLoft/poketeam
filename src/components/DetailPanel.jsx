import { useState, useEffect } from 'react';
import typeColors, { getTypeKo, getPokeApiTypeIconUrl } from '../data/typeColors';
import { getDefensiveMultiplier } from '../data/typeMatchups';
import { getPokemonKo } from '../data/pokemonNamesKo';
import { apiService } from '../services/apiService';
import { convertAllStats, calcHpLv50, calcStatLv50 } from '../utils/statCalc';
import { getMegaDataSync, fetchMegaData, megaForms } from '../utils/megaUtils';
import { hexToRgba } from '../utils/colorUtils';
import { natureTranslations, natureStatsMap } from '../data/natureData';
import { damageItems } from '../data/itemBoostData';
import { abilityBoosts } from '../data/abilityBoostData';
import moveFlagsData from '../data/moveFlags.json';
import { calcDamageRange } from '../utils/damageCalc';
import LoadingSpinner from './LoadingSpinner';
import TopAbilitiesBox from './TopAbilitiesBox';

/** Convert PokéChamp stat points → traditional EV: max(0, P*8 - 4) */
const champToEv = (points) => Math.max(0, (points || 0) * 8 - 4);

function DetailPanel({ pokemon, activeMega, onToggleMega, allPokemon, battleFormat, setBattleFormat, onSuggestionClick, isMatchupMode = false, oppStats = null, oppTypes = [], oppAbilityKo = '', oppItemName = '' }) {
  const [battleData, setBattleData] = useState(null);
  const [moveDetails, setMoveDetails] = useState({});
  const [itemNames, setItemNames] = useState({});
  const [abilityNames, setAbilityNames] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredMove, setHoveredMove] = useState(null);
  const [megaAbilityKo, setMegaAbilityKo] = useState(null);

  // New states for Metadata and Calculator
  const [basicInfo, setBasicInfo] = useState(null);
  const [calcEvs, setCalcEvs] = useState({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  const [calcNature, setCalcNature] = useState('Hardy');
  const [offenseRank, setOffenseRank] = useState(0);
  const [openRankDropdown, setOpenRankDropdown] = useState(null);
  const [isRankGuideOpen, setIsRankGuideOpen] = useState(false);


  const [megaSprites, setMegaSprites] = useState({});

  const totalPoints = Object.values(calcEvs).reduce((a, b) => a + b, 0);

  const handleEvChange = (stat, val) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    num = Math.max(0, Math.min(32, num));
    setCalcEvs(prev => ({ ...prev, [stat]: num }));
  };

  useEffect(() => {
    if (battleData) {
      const topItemsRaw = (battleData.rows || []).filter(r => r.category === 'held_item').sort((a, b) => a.rank - b.rank);
      let autoMega = null;
      const topItemName = topItemsRaw.length > 0 ? topItemsRaw[0].name : '';
      const isMegaStone = topItemName.includes('ite') || topItemName.includes('나이트') || topItemName.endsWith('nite');
      if (isMegaStone && !topItemName.includes('Eviolite') && !topItemName.includes('Meteorite') && !topItemName.includes('휘석') && !topItemName.includes('운석')) {
        if (topItemName.includes(' X') || topItemName.endsWith('X') || topItemName.endsWith('-x')) autoMega = 'x';
        else if (topItemName.includes(' Y') || topItemName.endsWith('Y') || topItemName.endsWith('-y')) autoMega = 'y';
        else autoMega = 'mega';
      }
      const effMega = (activeMega === 'base' || activeMega === false) 
        ? null 
        : ((activeMega !== null && activeMega !== undefined) ? activeMega : autoMega);

      let topPoints = (battleData.rows || []).filter(r => r.category === 'stat_points').sort((a,b)=>a.rank-b.rank);
      let topNatures = (battleData.rows || []).filter(r => r.category === 'stat_alignment').sort((a,b)=>a.rank-b.rank);

      const isX = effMega === 'X' || effMega === 'x';
      const isY = effMega === 'Y' || effMega === 'y';

      if (isX) {
        const physNature = topNatures.find(n => natureStatsMap[n.name] && natureStatsMap[n.name].up === '공격');
        if (physNature) topNatures = [physNature, ...topNatures.filter(n => n !== physNature)];
        const physEv = topPoints.find(p => p.attack_points > 10);
        if (physEv) topPoints = [physEv, ...topPoints.filter(p => p !== physEv)];
      } else if (isY) {
        const spaNature = topNatures.find(n => natureStatsMap[n.name] && natureStatsMap[n.name].up === '특공');
        if (spaNature) topNatures = [spaNature, ...topNatures.filter(n => n !== spaNature)];
        const spaEv = topPoints.find(p => p.sp_atk_points > 10);
        if (spaEv) topPoints = [spaEv, ...topPoints.filter(p => p !== spaEv)];
      }

      if (topPoints.length > 0) {
        const sp = topPoints[0];
        setCalcEvs({
          hp: sp.hp_points || 0,
          atk: sp.attack_points || 0,
          def: sp.defense_points || 0,
          spa: sp.sp_atk_points || 0,
          spd: sp.sp_def_points || 0,
          spe: sp.speed_points || 0
        });
        setCalcNature(topNatures.length > 0 ? topNatures[0].name : 'Hardy');
      } else {
        setCalcEvs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
        setCalcNature('Hardy');
      }
    }
  }, [battleData, activeMega]);

  useEffect(() => {
    if (!pokemon) {
      setBattleData(null);
      setMoveDetails({});
      setBasicInfo(null);
      setItemNames({});
      setAbilityNames({});
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await apiService.fetchBattleData(battleFormat, pokemon.name);

        // Fetch ALL moves with 1%+ usage (no longer limited to 10)
        let allMoves = (data.rows || [])
          .filter(r => r.category === 'move' && (r.percentage_value ?? parseFloat(r.percentage)) >= 1)
          .sort((a, b) => a.rank - b.rank);
        
        // Hardcoded standard moves for X/Y Mega forms to replace PokeAPI fetch
        const megaXYMoves = {
          charizard: [
            'flare-blitz', 'outrage', 'dragon-claw', 'flame-charge', 'thunder-punch', 'earthquake', 'dragon-dance', 'roost', 'swords-dance', 'will-o-wisp',
            'flamethrower', 'fire-blast', 'solar-beam', 'focus-blast', 'air-slash', 'weather-ball', 'tailwind', 'protect', 'overheat'
          ],
          mewtwo: [
            'zen-headbutt', 'close-combat', 'ice-punch', 'earthquake', 'poison-jab', 'bulk-up', 'taunt', 'recover', 'drain-punch', 'stone-edge',
            'psystrike', 'ice-beam', 'fire-blast', 'focus-blast', 'shadow-ball', 'aura-sphere', 'calm-mind', 'protect'
          ],
          raichu: [
            'volt-tackle', 'fake-out', 'brick-break', 'thunder-punch', 'wild-charge', 'nuzzle', 'play-rough', 'quick-attack', 'iron-tail', 'dig',
            'thunderbolt', 'focus-blast', 'surf', 'grass-knot', 'hidden-power', 'volt-switch', 'nasty-plot', 'protect', 'encore', 'substitute'
          ]
        };

        const learnableMovesRaw = megaXYMoves[pokemon.name.toLowerCase()] || [];
        if (learnableMovesRaw && learnableMovesRaw.length > 0) {
          const existingNames = new Set(allMoves.map(m => m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')));
          const extraMoves = learnableMovesRaw
            .filter(m => !existingNames.has(m))
            .map(m => ({
              name: m,
              category: 'move',
              percentage: 0,
              percentage_value: 0,
              rank: 999
            }));
          allMoves = [...allMoves, ...extraMoves];
          if (!data.rows) data.rows = [];
          data.rows.push(...extraMoves);
        }

        // Now set battle data with the extra moves included
        setBattleData(data);

        const detailsMap = {};
        const chunkSize = 15;
        for (let i = 0; i < allMoves.length; i += chunkSize) {
          const chunk = allMoves.slice(i, i + chunkSize);
          await Promise.all(chunk.map(async (m) => {
            const info = await apiService.fetchMoveInfo(m.name);
            detailsMap[m.name] = info;
          }));
        }
        setMoveDetails(detailsMap);

        const topItemsRaw = (data.rows || []).filter(r => r.category === 'held_item').sort((a, b) => a.rank - b.rank).slice(0, 5);
        const topAbilitiesRaw = (data.rows || []).filter(r => r.category === 'ability').sort((a, b) => a.rank - b.rank).slice(0, 3);

        let autoMega = null;
        const topItemName = topItemsRaw.length > 0 ? topItemsRaw[0].name : '';
        const isMegaStone = topItemName.includes('ite') || topItemName.includes('나이트') || topItemName.endsWith('nite');
        if (isMegaStone && !topItemName.includes('Eviolite') && !topItemName.includes('Meteorite') && !topItemName.includes('휘석') && !topItemName.includes('운석')) {
          if (topItemName.includes(' X') || topItemName.endsWith('X') || topItemName.endsWith('-x')) autoMega = 'x';
          else if (topItemName.includes(' Y') || topItemName.endsWith('Y') || topItemName.endsWith('-y')) autoMega = 'y';
          else autoMega = 'mega';
        }
        const effectiveMega = (activeMega === 'base' || activeMega === false) 
          ? null 
          : ((activeMega !== null && activeMega !== undefined) ? activeMega : autoMega);
        
        if (effectiveMega) {
          const mData = await fetchMegaData(pokemon.name, effectiveMega);
          if (mData && mData.abilityEng) {
            const abInfo = await apiService.fetchAbilityInfo(mData.abilityEng);
            setMegaAbilityKo(abInfo);
            setAbilityNames(prev => ({ ...prev, [abInfo.name]: abInfo }));
          } else {
            setMegaAbilityKo(null);
          }
        } else {
          setMegaAbilityKo(null);
        }

        // Fetch Mega Sprites if available
        const forms = megaForms[pokemon.name] || [];
        const sprites = {};
        await Promise.all(forms.map(async (f) => {
          const mData = await fetchMegaData(pokemon.name, f);
          if (mData) {
            sprites[f] = mData.spriteUrl;
          }
        }));
        setMegaSprites(sprites);

        const bInfo = await apiService.fetchPokemonBasicInfo(pokemon.name, effectiveMega);
        if (bInfo) setBasicInfo(bInfo);

        const itemMap = {};
        await Promise.all(topItemsRaw.map(async (i) => {
          itemMap[i.name] = await apiService.fetchItemInfo(i.name);
        }));
        setItemNames(itemMap);

        const abilityMap = {};
        await Promise.all(topAbilitiesRaw.map(async (a) => {
          abilityMap[a.name] = await apiService.fetchAbilityInfo(a.name);
        }));
        setAbilityNames(abilityMap);

      } catch (err) {
        setError('데이터를 불러오지 못했습니다.');
        setBattleData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pokemon, battleFormat, activeMega]);

  if (!pokemon) {
    return (
      <main className="detail-panel">
        <div className="detail-panel__empty">
          <span className="detail-panel__empty-icon">⚔️</span>
          <p className="detail-panel__empty-text">포켓몬을 선택하면 상세 정보가 표시됩니다</p>
        </div>
      </main>
    );
  }
  // Parsed Battle Data
  const parsedRows = battleData?.rows || [];
  
  let allMoveRows = (parsedRows || []).filter(r => r.category === 'move' && ((r.percentage_value ?? parseFloat(r.percentage)) >= 1 || r.rank === 999)).sort((a, b) => a.rank - b.rank);
  
  let autoMega = null;
  const topItems = parsedRows.filter(r => r.category === 'held_item').sort((a, b) => a.rank - b.rank).slice(0, 5);
  const topItemName = topItems.length > 0 ? topItems[0].name : '';
  const isMegaStone = topItemName.includes('ite') || topItemName.includes('나이트') || topItemName.endsWith('nite');
  if (isMegaStone && !topItemName.includes('Eviolite') && !topItemName.includes('Meteorite') && !topItemName.includes('휘석') && !topItemName.includes('운석')) {
    if (topItemName.includes(' X') || topItemName.endsWith('X') || topItemName.endsWith('-x')) autoMega = 'x';
    else if (topItemName.includes(' Y') || topItemName.endsWith('Y') || topItemName.endsWith('-y')) autoMega = 'y';
    else autoMega = 'mega';
  }
  const effectiveMega = (activeMega === 'base' || activeMega === false) 
    ? null 
    : ((activeMega !== null && activeMega !== undefined) ? activeMega : autoMega);
  const effMegaLower = typeof effectiveMega === 'string' ? effectiveMega.toLowerCase() : effectiveMega;

  if (effMegaLower === 'x') {
    allMoveRows = allMoveRows.filter(m => {
      const info = moveDetails[m.name];
      if (!info) return true;
      return info.damageClass !== 'special';
    });
  } else if (effMegaLower === 'y') {
    allMoveRows = allMoveRows.filter(m => {
      const info = moveDetails[m.name];
      if (!info) return true;
      return info.damageClass !== 'physical';
    });
  }

  const megaData = getMegaDataSync(pokemon.name, effectiveMega);

  const spriteUrl = megaData?.spriteUrl || apiService.getSpriteUrl(pokemon.name);
  let koName = getPokemonKo(pokemon.name);
  if (effectiveMega) koName = `메가${koName}${effectiveMega === 'x' || effectiveMega === 'y' ? effectiveMega.toUpperCase() : ''}`;
  const types = megaData?.types || pokemon.summary?.types || [];
  const rawStats = megaData?.baseStats || pokemon.summary?.baseStats || {};
  let base;
  if (megaData?.baseStats) {
    base = {
      hp: rawStats.hp,
      atk: rawStats.attack,
      def: rawStats.defense,
      spa: rawStats.sp_attack,
      spd: rawStats.sp_defense,
      spe: rawStats.speed,
      total: rawStats.hp + rawStats.attack + rawStats.defense + rawStats.sp_attack + rawStats.sp_defense + rawStats.speed
    };
  } else {
    base = convertAllStats(rawStats);
  }
  const { hp: baseHp, atk: baseAtk, def: baseDef, spa: baseSpa, spd: baseSpd, spe: baseSpe, total: totalStats } = base;

  const getNatureMultForCalc = (statKey) => {
    const statInfo = natureStatsMap[calcNature];
    if (!statInfo) return 1.0;
    const upMap = { '공격': 'atk', '방어': 'def', '특공': 'spa', '특방': 'spd', '스피드': 'spe' };
    const downMap = { '공격': 'atk', '방어': 'def', '특공': 'spa', '특방': 'spd', '스피드': 'spe' };
    if (upMap[statInfo.up] === statKey) return 1.1;
    if (downMap[statInfo.down] === statKey) return 0.9;
    return 1.0;
  };

  let topAbilities = parsedRows.filter(r => r.category === 'ability').sort((a, b) => a.rank - b.rank);
  if (effectiveMega && megaAbilityKo) {
    topAbilities = [{
      name: megaAbilityKo.name,
      percentage: 100,
      rank: 1,
      category: 'ability'
    }];
  }
  
  // Determine active ability to apply stat/damage modifiers
  let activeAbilityMeta = null;
  if (topAbilities.length > 0) {
    const topAbName = topAbilities[0].name;
    if (abilityBoosts[topAbName]) {
      activeAbilityMeta = abilityBoosts[topAbName];
    }
  }

  // Base calculated stats before modifiers
  let rawAtk = calcStatLv50(baseAtk, champToEv(calcEvs.atk), getNatureMultForCalc('atk'));
  let rawSpa = calcStatLv50(baseSpa, champToEv(calcEvs.spa), getNatureMultForCalc('spa'));
  
  // Apply ability stat modifiers (e.g. Huge Power)
  if (activeAbilityMeta && activeAbilityMeta.type === 'stat') {
    if (activeAbilityMeta.stat === 'atk') rawAtk = Math.floor(rawAtk * activeAbilityMeta.mult);
    if (activeAbilityMeta.stat === 'spa') rawSpa = Math.floor(rawSpa * activeAbilityMeta.mult);
  }

  const calcHp = calcHpLv50(baseHp, champToEv(calcEvs.hp));
  const calcAtk = rawAtk;
  const calcDef = calcStatLv50(baseDef, champToEv(calcEvs.def), getNatureMultForCalc('def'));
  const calcSpa = rawSpa;
  const calcSpd = calcStatLv50(baseSpd, champToEv(calcEvs.spd), getNatureMultForCalc('spd'));
  const calcSpe = calcStatLv50(baseSpe, champToEv(calcEvs.spe), getNatureMultForCalc('spe'));

  const calcPhysDur = Math.floor(calcHp * calcDef / 0.411);
  const calcSpecDur = Math.floor(calcHp * calcSpd / 0.411);
  const calcScarfSpe = Math.floor(calcSpe * 1.5);

  // Defensive Matchups
  const capTypes = types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
  const multipliers = getDefensiveMultiplier(capTypes);
  const matchupGroups = { '4': [], '2': [], '0.5': [], '0.25': [], '0': [] };
  Object.entries(multipliers).forEach(([atkType, mult]) => {
    const key = mult.toString();
    if (matchupGroups[key]) {
      matchupGroups[key].push(atkType.toLowerCase());
    }
  });
  let topNatures = parsedRows.filter(r => r.category === 'stat_alignment').sort((a, b) => a.rank - b.rank);
  let topStatPoints = parsedRows.filter(r => r.category === 'stat_points').sort((a, b) => a.rank - b.rank);
  
  const isX2 = effectiveMega === 'X' || effectiveMega === 'x';
  const isY2 = effectiveMega === 'Y' || effectiveMega === 'y';

  if (isX2) {
    const physNature = topNatures.find(n => natureStatsMap[n.name] && natureStatsMap[n.name].up === '공격');
    if (physNature) topNatures = [physNature, ...topNatures.filter(n => n !== physNature)];
    const physEv = topStatPoints.find(p => p.attack_points > 10);
    if (physEv) topStatPoints = [physEv, ...topStatPoints.filter(p => p !== physEv)];
  } else if (isY2) {
    const spaNature = topNatures.find(n => natureStatsMap[n.name] && natureStatsMap[n.name].up === '특공');
    if (spaNature) topNatures = [spaNature, ...topNatures.filter(n => n !== spaNature)];
    const spaEv = topStatPoints.find(p => p.sp_atk_points > 10);
    if (spaEv) topStatPoints = [spaEv, ...topStatPoints.filter(p => p !== spaEv)];
  }
  
  topStatPoints = topStatPoints.slice(0, 3);

  const getPct = (row) => parseFloat(row.percentage_value ?? row.percentage ?? 0) || 0;
  
  const getPctStyle = (pct) => {
    let color = '#64748b';
    if (pct >= 90) color = '#000000';
    else if (pct >= 50) color = '#dc2626';
    else if (pct >= 20) color = '#f97316';
    else if (pct >= 10) color = '#3b82f6';
    const fontWeight = pct >= 90 ? '900' : (pct >= 20 ? 'bold' : 'normal');
    return { color, fontWeight };
  };

  const getItemBadges = (itemName) => {
    const badges = [];
    const nameStr = itemName || '';
    if (nameStr.includes('Life Orb')) {
      badges.push({ text: '위력 1.3배', color: '#ef4444' });
      badges.push({ text: '공격 시 HP 1/10 감소', color: '#64748b' });
    } else if (nameStr.includes('Choice Band')) {
      badges.push({ text: '물리 1.5배', color: '#dc2626' });
      badges.push({ text: '기술 고정', color: '#64748b' });
    } else if (nameStr.includes('Choice Specs')) {
      badges.push({ text: '특수 1.5배', color: '#3b82f6' });
      badges.push({ text: '기술 고정', color: '#64748b' });
    } else if (nameStr.includes('Choice Scarf')) {
      badges.push({ text: '스피드 1.5배', color: '#10b981' });
      badges.push({ text: '기술 고정', color: '#64748b' });
    } else if (nameStr.includes('Focus Sash')) {
      badges.push({ text: 'HP풀일때 기절 면역', color: '#eab308' });
    } else if (nameStr.includes('Assault Vest')) {
      badges.push({ text: '특방 1.5배', color: '#3b82f6' });
      badges.push({ text: '변화기 사용 불가', color: '#64748b' });
    } else if (nameStr.includes('Leftovers')) {
      badges.push({ text: '매턴 HP 1/16 회복', color: '#22c55e' });
    } else if (nameStr.includes('Sitrus Berry')) {
      badges.push({ text: 'HP 1/2↓시 1/4 회복', color: '#22c55e' });
    } else if (nameStr.includes('Clear Amulet')) {
      badges.push({ text: '랭크다운 면역', color: '#8b5cf6' });
    } else if (nameStr.includes('Covert Cloak')) {
      badges.push({ text: '부가효과 면역', color: '#8b5cf6' });
    } else if (nameStr.includes('Rocky Helmet')) {
      badges.push({ text: '접촉기 피격 시 상대 1/6 피해', color: '#ef4444' });
    } else if (nameStr.includes('Heavy-Duty Boots')) {
      badges.push({ text: '장판기 면역', color: '#8b5cf6' });
    } else if (nameStr.includes('Loaded Dice')) {
      badges.push({ text: '연속기 4~5회 명중', color: '#f97316' });
    } else if (nameStr.includes('Punching Glove')) {
      badges.push({ text: '펀치 위력 1.2배 / 비접촉', color: '#dc2626' });
    } else if (nameStr.includes('Expert Belt')) {
      badges.push({ text: '약점 공격 1.2배', color: '#eab308' });
    } else if (nameStr.includes('Booster Energy')) {
      badges.push({ text: '가장 높은 능력치 랭크업', color: '#3b82f6' });
    } else if (nameStr.includes('Lum Berry')) {
      badges.push({ text: '모든 상태이상 회복', color: '#10b981' });
    } else if (['Chesto', 'Pecha', 'Aspear', 'Cheri', 'Rawst', 'Persim'].some(b => nameStr.includes(`${b} Berry`))) {
      badges.push({ text: '상태이상 회복', color: '#10b981' });
    } else if (['Figy', 'Wiki', 'Mago', 'Aguav', 'Iapapa'].some(b => nameStr.includes(`${b} Berry`))) {
      badges.push({ text: 'HP 1/4↓시 1/3 회복', color: '#22c55e' });
    } else if (['Occa', 'Passho', 'Wacan', 'Rindo', 'Yache', 'Chople', 'Kebia', 'Shuca', 'Coba', 'Payapa', 'Tanga', 'Charti', 'Kasib', 'Haban', 'Colbur', 'Babiri', 'Roseli'].some(b => nameStr.includes(`${b} Berry`))) {
      badges.push({ text: '약점 피격 시 데미지 반감', color: '#f59e0b' });
    } else if (['Liechi', 'Ganlon', 'Salac', 'Petaya', 'Apicot', 'Kee', 'Maranga'].some(b => nameStr.includes(`${b} Berry`))) {
      badges.push({ text: '조건부 랭크업', color: '#3b82f6' });
    } else if (nameStr.includes('Scope Lens') || nameStr.includes('Razor Claw')) {
      badges.push({ text: '급소율 1랭↑', color: '#f43f5e' });
    } else if (nameStr.includes('Muscle Band')) {
      badges.push({ text: '물리 1.1배', color: '#dc2626' });
    } else if (nameStr.includes('Wise Glasses')) {
      badges.push({ text: '특수 1.1배', color: '#3b82f6' });
    } else if (nameStr.includes('Air Balloon')) {
      badges.push({ text: '땅 무효 (피격 시 터짐)', color: '#a8a29e' });
    } else if (nameStr.includes('White Herb')) {
      badges.push({ text: '랭크다운 1회 복구', color: '#f8fafc', textColor: '#475569' });
    } else if (nameStr.includes('Mental Herb')) {
      badges.push({ text: '변화기 속박 1회 복구', color: '#ec4899' });
    } else if (nameStr.includes('Power Herb')) {
      badges.push({ text: '모으는 기술 즉시 발동', color: '#eab308' });
    } else if (nameStr.includes('Eject Button')) {
      badges.push({ text: '피격 시 강제 교체', color: '#8b5cf6' });
    } else if (nameStr.includes('Eject Pack')) {
      badges.push({ text: '랭크다운 시 강제 교체', color: '#8b5cf6' });
    } else if (nameStr.includes('Red Card')) {
      badges.push({ text: '피격 시 상대 강제 교체', color: '#ef4444' });
    } else if (nameStr.includes('Weakness Policy')) {
      badges.push({ text: '약점 피격 시 공/특공 2랭↑', color: '#f43f5e' });
    } else if (nameStr.includes('Blunder Policy')) {
      badges.push({ text: '기술 빗나갈 시 스피드 2랭↑', color: '#3b82f6' });
    } else if (nameStr.includes('Room Service')) {
      badges.push({ text: '트릭룸 시 스피드 1랭↓', color: '#a8a29e' });
    } else if (nameStr.includes('Throat Spray')) {
      badges.push({ text: '소리 기술 사용 시 특공 1랭↑', color: '#3b82f6' });
    } else if (nameStr.includes('Safety Goggles')) {
      badges.push({ text: '가루/날씨 데미지 무효', color: '#64748b' });
    } else if (nameStr.includes('Protective Pads')) {
      badges.push({ text: '접촉기 부가효과 면역', color: '#64748b' });
    } else if (nameStr.includes('Terrain Extender')) {
      badges.push({ text: '필드 8턴', color: '#eab308' });
    } else if (nameStr.includes('Light Clay')) {
      badges.push({ text: '벽 8턴', color: '#3b82f6' });
    } else if (['Damp Rock', 'Heat Rock', 'Smooth Rock', 'Icy Rock'].some(b => nameStr.includes(b))) {
      badges.push({ text: '날씨 8턴', color: '#eab308' });
    } else if (nameStr.includes('Black Sludge')) {
      badges.push({ text: '독타입 1/16 회복 (그외 피해)', color: '#a21caf' });
    } else if (nameStr.includes('Flame Orb')) {
      badges.push({ text: '턴 종료 시 화상', color: '#ef4444' });
    } else if (nameStr.includes('Toxic Orb')) {
      badges.push({ text: '턴 종료 시 맹독', color: '#a21caf' });
    } else if (nameStr.includes('Grip Claw')) {
      badges.push({ text: '바인딩 7턴', color: '#64748b' });
    } else if (nameStr.includes('Binding Band')) {
      badges.push({ text: '바인딩 데미지 1/6', color: '#64748b' });
    } else {
      return null;
    }
    return badges;
  };

  const getAbilityBadges = (abilityName) => {
    const badges = [];
    const nameStr = abilityName || '';
    if (nameStr.includes('Intimidate')) {
      badges.push({ text: '등장 시 상대 공 1랭↓', color: '#ef4444' });
    } else if (nameStr.includes('Rough Skin') || nameStr.includes('Iron Barbs')) {
      badges.push({ text: '접촉 피격 시 1/8 피해', color: '#f59e0b' });
    } else if (nameStr.includes('Defiant') || nameStr.includes('Competitive')) {
      badges.push({ text: '랭크다운 시 2랭↑', color: '#3b82f6' });
    } else if (nameStr.includes('Levitate')) {
      badges.push({ text: '땅타입 무효', color: '#8b5cf6' });
    } else if (nameStr.includes('Multiscale') || nameStr.includes('Shadow Shield')) {
      badges.push({ text: 'HP풀일때 데미지 반감', color: '#10b981' });
    } else if (['Swift Swim', 'Chlorophyll', 'Sand Rush', 'Slush Rush'].some(a => nameStr.includes(a))) {
      badges.push({ text: '날씨 시 스피드 2배', color: '#3b82f6' });
    } else if (['Drought', 'Drizzle', 'Sand Stream', 'Snow Warning'].some(a => nameStr.includes(a))) {
      badges.push({ text: '등장 시 날씨 변화', color: '#eab308' });
    } else if (['Electric Surge', 'Grassy Surge', 'Psychic Surge', 'Misty Surge'].some(a => nameStr.includes(a))) {
      badges.push({ text: '등장 시 필드 변화', color: '#eab308' });
    } else if (nameStr.includes('Regenerator')) {
      badges.push({ text: '교체 시 HP 1/3 회복', color: '#22c55e' });
    } else if (['Clear Body', 'White Smoke', 'Full Metal Body'].some(a => nameStr.includes(a))) {
      badges.push({ text: '상대 랭크다운 면역', color: '#8b5cf6' });
    } else if (nameStr.includes('Unaware')) {
      badges.push({ text: '상대 랭크 변화 무시', color: '#ec4899' });
    } else if (nameStr.includes('Prankster')) {
      badges.push({ text: '변화기 우선도 +1', color: '#8b5cf6' });
    } else if (nameStr.includes('Huge Power') || nameStr.includes('Pure Power')) {
      badges.push({ text: '물리 공격력 2배', color: '#dc2626' });
    } else if (nameStr.includes('Speed Boost')) {
      badges.push({ text: '매턴 종료 시 스피드 1랭↑', color: '#3b82f6' });
    } else if (['Mold Breaker', 'Teravolt', 'Turboblaze'].some(a => nameStr.includes(a))) {
      badges.push({ text: '방어적 특성 무시', color: '#f43f5e' });
    } else if (nameStr.includes('Libero') || nameStr.includes('Protean')) {
      badges.push({ text: '사용 기술 타입으로 변환', color: '#8b5cf6' });
    } else if (nameStr.includes('Magic Bounce')) {
      badges.push({ text: '변화기 반사', color: '#ec4899' });
    } else if (nameStr.includes('Magic Guard')) {
      badges.push({ text: '공격 외 데미지 무효', color: '#8b5cf6' });
    } else if (['Static', 'Flame Body', 'Effect Spore'].some(a => nameStr.includes(a))) {
      badges.push({ text: '접촉 피격 시 상태이상', color: '#f59e0b' });
    } else if (nameStr.includes('Guts')) {
      badges.push({ text: '상태이상 시 공격 1.5배', color: '#dc2626' });
    } else if (nameStr.includes('Serene Grace')) {
      badges.push({ text: '부가효과 확률 2배', color: '#10b981' });
    } else if (nameStr.includes('Beast Boost')) {
      badges.push({ text: '적 기절 시 최고 능력치 1랭↑', color: '#3b82f6' });
    } else if (nameStr.includes('Moxie') || nameStr.includes('Chilling Neigh')) {
      badges.push({ text: '적 기절 시 공격 1랭↑', color: '#dc2626' });
    } else if (nameStr.includes('Grim Neigh')) {
      badges.push({ text: '적 기절 시 특공 1랭↑', color: '#3b82f6' });
    } else if (['Protosynthesis', 'Quark Drive'].some(a => nameStr.includes(a))) {
      badges.push({ text: '활성화 시 최고 능력치 상승', color: '#f43f5e' });
    } else if (nameStr.includes('Good as Gold')) {
      badges.push({ text: '변화기 무효', color: '#eab308' });
    } else if (nameStr.includes('Purifying Salt')) {
      badges.push({ text: '상태이상 면역 / 고스트 반감', color: '#8b5cf6' });
    } else if (nameStr.includes('Well-Baked Body')) {
      badges.push({ text: '불꽃 무효 / 방어 2랭↑', color: '#ef4444' });
    } else if (nameStr.includes('Water Absorb')) {
      badges.push({ text: '물 무효+회복', color: '#3b82f6' });
    } else if (nameStr.includes('Volt Absorb')) {
      badges.push({ text: '전기 무효+회복', color: '#eab308' });
    } else if (nameStr.includes('Earth Eater')) {
      badges.push({ text: '땅 무효+회복', color: '#d97706' });
    } else if (nameStr.includes('Flash Fire')) {
      badges.push({ text: '불꽃 무효+위력업', color: '#ef4444' });
    } else if (nameStr.includes('Sap Sipper')) {
      badges.push({ text: '풀 무효+공 1랭↑', color: '#22c55e' });
    } else if (nameStr.includes('Motor Drive')) {
      badges.push({ text: '전기 무효+스피드 1랭↑', color: '#eab308' });
    } else if (nameStr.includes('Lightning Rod') || nameStr.includes('Storm Drain')) {
      badges.push({ text: '전기/물 무효+특공 1랭↑', color: '#3b82f6' });
    } else if (nameStr.includes('Technician')) {
      badges.push({ text: '위력 60↓ 기술 1.5배', color: '#dc2626' });
    } else if (nameStr.includes('Skill Link')) {
      badges.push({ text: '연속기 최대 회수 명중', color: '#f97316' });
    } else if (nameStr.includes('Sniper')) {
      badges.push({ text: '급소 데미지 증가', color: '#ef4444' });
    } else if (nameStr.includes('Infiltrator')) {
      badges.push({ text: '벽/대타 무시', color: '#64748b' });
    } else if (nameStr.includes('No Guard')) {
      badges.push({ text: '모든 기술 필중', color: '#8b5cf6' });
    } else {
      return null;
    }
    return badges;
  };

  const topTeammates = parsedRows
    .filter(r => r.category === 'teammate')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 6)
    .map(t => {
      const pkm = allPokemon.find(p => p.name === t.name || p.battleName === t.name);
      return pkm ? { ...pkm, pct: getPct(t) } : null;
    }).filter(Boolean);

  // Setup moves detection
  const availableSetups = [];
  allMoveRows.forEach(m => {
    const info = moveDetails[m.name];
    if (!info) return;
    if (info.name === '칼춤') availableSetups.push({ name: '칼춤', mult: 2.0, type: 'physical', label: '칼춤(+2)' });
    if (info.name === '나쁜음모') availableSetups.push({ name: '나쁜음모', mult: 2.0, type: 'special', label: '나쁜음모(+2)' });
    if (info.name === '용의춤') availableSetups.push({ name: '용의춤', mult: 1.5, type: 'physical', label: '용의춤(+1)' });
    if (info.name === '벌크업') availableSetups.push({ name: '벌크업', mult: 1.5, type: 'physical', label: '벌크업(+1)' });
    if (info.name === '명상') availableSetups.push({ name: '명상', mult: 1.5, type: 'special', label: '명상(+1)' });
    if (info.name === '배북') availableSetups.push({ name: '배북', mult: 4.0, type: 'physical', label: '배북(+6)' });
  });

  // Damage boost items detection (Top 3)
  const dmgBoostItems = [];
  topItems.slice(0, 3).forEach(it => {
    const info = itemNames[it.name] || {};
    const itemNameKo = info.name || it.name;
    const meta = damageItems[it.name];
    if (meta) {
      dmgBoostItems.push({
        name: itemNameKo,
        sprite: info.sprite,
        meta
      });
    }
  });

  // Usage helpers
  const getUsagePct = (row) => {
    const val = row.percentage_value ?? parseFloat(row.percentage) ?? 0;
    return typeof val === 'number' && !isNaN(val) ? val.toFixed(1) : '-';
  };
  const hasScarf = topItems.some(it => it.name === 'Choice Scarf');

  // ===== REAL SET TABLE: nature × EV spread =====
  const buildSets = () => {
    if (topStatPoints.length === 0) return [];
    // Get top nature (rank 1)
    const topNature = topNatures.length > 0 ? topNatures[0] : null;
    
    return topStatPoints.map((sp, idx) => {
      // Convert PokéChamp points → traditional EVs
      const evHp = champToEv(sp.hp_points);
      const evAtk = champToEv(sp.attack_points);
      const evDef = champToEv(sp.defense_points);
      const evSpa = champToEv(sp.sp_atk_points);
      const evSpd = champToEv(sp.sp_def_points);
      const evSpe = champToEv(sp.speed_points);

      // Guess a reasonable nature for this spread
      // Use the top nature for rank 1, try to match stat distribution for others
      let nature = topNature;
      if (idx > 0 && topNatures.length > 1) {
        // Try to find a matching nature from ranked list
        nature = topNatures[Math.min(idx, topNatures.length - 1)];
      }
      const natureName = nature?.name || 'Hardy';
      const natureKo = natureTranslations[natureName] || natureName;
      const statInfo = natureStatsMap[natureName];

      // Nature multipliers
      const getNatureMult = (statKey) => {
        if (!statInfo) return 1.0;
        const upMap = { '공격': 'atk', '방어': 'def', '특공': 'spa', '특방': 'spd', '스피드': 'spe' };
        const downMap = { '공격': 'atk', '방어': 'def', '특공': 'spa', '특방': 'spd', '스피드': 'spe' };
        if (upMap[statInfo.up] === statKey) return 1.1;
        if (downMap[statInfo.down] === statKey) return 0.9;
        return 1.0;
      };

      const hp = calcHpLv50(baseHp, evHp);
      const atk = calcStatLv50(baseAtk, evAtk, getNatureMult('atk'));
      const def = calcStatLv50(baseDef, evDef, getNatureMult('def'));
      const spa = calcStatLv50(baseSpa, evSpa, getNatureMult('spa'));
      const spd = calcStatLv50(baseSpd, evSpd, getNatureMult('spd'));
      const spe = calcStatLv50(baseSpe, evSpe, getNatureMult('spe'));

      const physDur = Math.floor(hp * def / 0.411);
      const specDur = Math.floor(hp * spd / 0.411);

      // Build EV label in PokéChamp format
      const evParts = [];
      if (sp.hp_points) evParts.push(`H${sp.hp_points}`);
      const firepowerLabel = "(계산기 스탯 기준)";
      if (sp.attack_points) evParts.push(`A${sp.attack_points}`);
      if (sp.defense_points) evParts.push(`B${sp.defense_points}`);
      if (sp.sp_atk_points) evParts.push(`C${sp.sp_atk_points}`);
      if (sp.sp_def_points) evParts.push(`D${sp.sp_def_points}`);
      if (sp.speed_points) evParts.push(`S${sp.speed_points}`);
      const evLabel = evParts.join(' ') || '무진동';

      // Scarf speed
      const scarfSpe = Math.floor(spe * 1.5);

      return {
        rank: idx + 1,
        natureKo,
        natureRaw: natureName,
        statInfo,
        evLabel,
        pct: sp.percentage_value ?? parseFloat(sp.percentage) ?? 0,
        atk,
        spa,
        physDur,
        specDur,
        spe,
        scarfSpe,
        rawEvs: {
          hp: sp.hp_points || 0,
          atk: sp.attack_points || 0,
          def: sp.defense_points || 0,
          spa: sp.sp_atk_points || 0,
          spd: sp.sp_def_points || 0,
          spe: sp.speed_points || 0
        }
      };
    });
  };

  console.log("DetailPanel rendering..."); const sets = buildSets();
  
  const p252Plus = calcStatLv50(baseAtk, 252, 1.1);
  const s252Plus = calcStatLv50(baseSpa, 252, 1.1);
  const standardAtk = sets.length > 0 ? sets[0].atk : p252Plus;
  const standardSpa = sets.length > 0 ? sets[0].spa : s252Plus;

  const standardSet = sets.length > 0 ? sets[0] : null;
  const standardItem = topItems.length > 0 ? topItems[0] : null;
  const standardItemInfo = standardItem ? (itemNames[standardItem.name] || {}) : null;
  
  const calcBadges = [];
  const natureKo = natureTranslations[calcNature] || calcNature;
  if (natureKo !== '무사태평' && calcNature !== 'Hardy') {
    calcBadges.push({ text: natureKo, color: '#f59e0b', icon: '🍃' });
  }
  
  if (calcEvs.atk > 0) calcBadges.push({ text: `A${calcEvs.atk}`, color: '#ef4444' });
  if (calcEvs.spa > 0) calcBadges.push({ text: `C${calcEvs.spa}`, color: '#3b82f6' });
  
  if (standardItemInfo && standardItemInfo.name) {
    calcBadges.push({ text: standardItemInfo.name, color: '#10b981', sprite: standardItemInfo.sprite });
  }

  if (activeAbilityMeta && activeAbilityMeta.badge) {
    calcBadges.push({ text: activeAbilityMeta.badge, color: '#eab308' });
  }

  // ===== MATCHUP ROW RENDERER =====
  const renderMatchupRow = (label, multKey, colorClass) => {
    const types = matchupGroups[multKey];
    if (!types || types.length === 0) return null;
    return (
      <div className={`dp2-matchup-row ${colorClass}`}>
        <span className="dp2-matchup-label">{label}</span>
        <div className="dp2-matchup-icons">
          {types.map(t => (
            <img key={t} src={getPokeApiTypeIconUrl(t)} alt={t} title={getTypeKo(t)} className="dp2-type-icon" />
          ))}
        </div>
      </div>
    );
  };

  // ===== MOVE POWER DISPLAY (multi-hit) =====
  const getMovePowerDisplay = (info) => {
    if (!info || !info.power) return '-';
    if (info.minHits && info.maxHits) {
      if (info.minHits === info.maxHits) return `${info.power}×${info.minHits}`;
      return `${info.power}×${info.minHits}-${info.maxHits}`;
    }
    return `${info.power}`;
  };

  const getMoveTotalPower = (info) => {
    if (!info || !info.power) return 0;
    if (info.minHits && info.maxHits) {
      // Use expected hits
      const avgHits = (info.minHits + info.maxHits) / 2;
      return info.power * avgHits;
    }
    return info.power;
  };

  // ===== MOVE NOTE BADGES =====
  const getMoveNotes = (info) => {
    const notes = [];
    if (info.drain > 0) notes.push({ text: `흡수${info.drain}%`, color: '#22c55e' });
    if (info.drain < 0) notes.push({ text: `반동${Math.abs(info.drain)}%`, color: '#ef4444' });
    if (info.healing > 0) notes.push({ text: `회복${info.healing}%`, color: '#22c55e' });
    
    // Custom manual overrides for common moves
    const customNotes = {
      '역린': { text: '기술고정', color: '#b91c1c' },
      '꽃잎무춤': { text: '기술고정', color: '#b91c1c' },
      '암석봉인': { text: '상대 속도↓', color: '#f97316' },
      '얼어붙은바람': { text: '상대 속도↓', color: '#3b82f6' },
      '땅고르기': { text: '상대 속도↓', color: '#f59e0b' },
      '스케일샷': { text: '방↓ / 속↑', color: '#3b82f6' },
      '인파이트': { text: '방/특방↓', color: '#ef4444' },
      '엄청난힘': { text: '공/방↓', color: '#ef4444' },
      '드래곤테일': { text: '강제교체', color: '#8b5cf6' },
      '날려버리기': { text: '강제교체', color: '#8b5cf6' },
      '울부짖기': { text: '강제교체', color: '#8b5cf6' },
      '볼트체인지': { text: '명중 후 교체', color: '#8b5cf6' },
      '유턴': { text: '명중 후 교체', color: '#8b5cf6' },
      '퀵턴': { text: '명중 후 교체', color: '#8b5cf6' },
      '바톤터치': { text: '랭업 인계 후 교체', color: '#8b5cf6' },
      '막말내뱉기': { text: '상대 공/특공↓ 후 교체', color: '#8b5cf6' },
      '탁쳐서떨구기': { text: '도구해제(위력↑)', color: '#3f6212' },
      '속이다': { text: '풀죽음(첫턴)', color: '#ca8a04' },
      '신속': { text: '우선도+2', color: '#0ea5e9' },
      '스텔스록': { text: '스텔스록', color: '#78350f' },
      '독압정': { text: '독압정', color: '#a855f7' },
      '압정뿌리기': { text: '압정뿌리기', color: '#f59e0b' },
      '끈적끈적네트': { text: '끈적네트', color: '#854d0e' },
      '대타출동': { text: '대타출동(HP25%)', color: '#166534' },
      '방어': { text: '방어', color: '#1e40af' },
      '판별': { text: '방어', color: '#1e40af' },
      '도발': { text: '도발', color: '#991b1b' },
      '앵콜': { text: '앵콜', color: '#9d174d' },
      '용의춤': { text: '공/속 1랭↑', color: '#1e3a8a' },
      '나비춤': { text: '특공/특방/속 1랭↑', color: '#1e3a8a' },
      '껍질깨기': { text: '공/특공/속 2랭↑ 방/특방 1랭↓', color: '#991b1b' },
      '하품': { text: '졸음(다음턴 수면)', color: '#475569' },
      '사슬묶기': { text: '기술봉쇄', color: '#b91c1c' },
      '트릭': { text: '도구교환', color: '#475569' },
      '길동무': { text: '길동무', color: '#0f172a' },
    };

    if (customNotes[info.name]) {
      notes.push(customNotes[info.name]);
    } else {
      // Use category or generic stat changes if no custom note
      if (info.category === 'force-switch') notes.push({ text: '강제교체', color: '#8b5cf6' });
      
      if (info.statChanges && info.statChanges.length > 0) {
        info.statChanges.forEach(sc => {
          const statMap = { 'attack': '공', 'defense': '방', 'special-attack': '특공', 'special-defense': '특방', 'speed': '속' };
          const label = statMap[sc.stat] || sc.stat;
          const absChange = Math.abs(sc.change);
          const rankStr = absChange > 1 ? `${absChange}랭` : '';
          const arrow = sc.change > 0 ? `${rankStr}↑` : `${rankStr}↓`;
          
          let prefix = '';
          const isOpponentTarget = ['selected-pokemon', 'all-opponents', 'random-opponent', 'opponents-field'].includes(info.target);
          if (info.category === 'damage-lower' || isOpponentTarget) prefix = '상대 ';
          
          const chanceStr = info.statChance > 0 && info.statChance < 100 ? `${info.statChance}% ` : '';
          notes.push({ text: `${chanceStr}${prefix}${label}${arrow}`, color: sc.change > 0 ? '#3b82f6' : '#f97316' });
        });
      }
      
      if (info.ailment && info.ailment !== 'none') {
        const ailMap = { 
          'paralysis': { text: '마비', color: '#eab308' }, 
          'burn': { text: '화상', color: '#ef4444' }, 
          'freeze': { text: '얼음', color: '#06b6d4' }, 
          'poison': { text: '독', color: '#a855f7' }, 
          'sleep': { text: '수면', color: '#64748b' }, 
          'confusion': { text: '혼란', color: '#ec4899' }, 
          'leech-seed': { text: '씨뿌리기', color: '#22c55e' } 
        };
        const ailMeta = ailMap[info.ailment];
        if (ailMeta) {
          const chanceStr = info.ailmentChance > 0 && info.ailmentChance < 100 ? `${info.ailmentChance}% ` : '';
          notes.push({ text: `${chanceStr}${ailMeta.text}`, color: ailMeta.color });
        }
      }
    }

    return notes;
  };

  return (
    <main className="detail-panel detail-panel--glass">
      {isLoading && <div className="loading-overlay"><LoadingSpinner /></div>}
      
      <div className="dp-inner" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* ===== HEADER: Profile + Sample Sets ===== */}
        <div className="dp-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
          <div className="dp-profile" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg)', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)', minWidth: '160px', alignSelf: 'stretch', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.45)', borderRadius: '50%', border: '1px dashed rgba(0,0,0,0.08)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.02)' }}>
                <img style={{ width: '100px', height: '100px', objectFit: 'contain', imageRendering: 'pixelated' }} src={spriteUrl} alt={koName} onError={(e) => e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'} />
                
                {/* Mega Evolution Swap Buttons */}
                {onToggleMega && megaForms[pokemon.name] && (
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-12px', display: 'flex', gap: '4px', zIndex: 10 }}>
                    {/* If currently in a mega form, show swap to base form button */}
                    {effectiveMega && (
                      <button
                        onClick={() => onToggleMega('base')}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: 0,
                          overflow: 'visible'
                        }}
                        title="일반 폼으로 전환"
                      >
                        <img 
                          src={apiService.getSpriteUrl(pokemon.name)} 
                          alt="base form" 
                          style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
                        />
                        <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#94a3b8', color: '#ffffff', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 'bold' }}>
                          🔄
                        </span>
                      </button>
                    )}
                    {/* Show buttons for other mega forms that are NOT currently active */}
                    {(megaForms[pokemon.name] || []).filter(form => form !== effectiveMega).map((form) => (
                      <button
                        key={form}
                        onClick={() => onToggleMega(form)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          border: '1.5px solid var(--accent-primary)',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: 0,
                          overflow: 'visible'
                        }}
                        title={form === 'mega' ? '메가진화' : `메가진화 ${form.toUpperCase()}`}
                      >
                        <img 
                          src={megaSprites[form] || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/key-stone.png'} 
                          alt={`mega-${form}`} 
                          style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
                          onError={(e) => {
                            e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/key-stone.png';
                          }}
                        />
                        <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: 'var(--accent-primary)', color: '#ffffff', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 'bold' }}>
                          {form === 'mega' ? '⚡' : form.toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="dp-title-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 6px 0', color: '#0f172a', textAlign: 'center' }}>{koName}</h2>
                <div className="dp-types" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  {types.map(t => (
                    <img key={t} src={getPokeApiTypeIconUrl(t)} alt={t} title={getTypeKo(t)} style={{width: '28px', height: '28px', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'}} />
                  ))}
                </div>
              </div>
            </div>

            {/* Vertical HABCDS Stats right side */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px dashed rgba(0,0,0,0.1)', paddingLeft: '16px' }}>
              {[
                { label: 'H', value: baseHp, color: '#ff5959' },
                { label: 'A', value: baseAtk, color: '#f59e0b' },
                { label: 'B', value: baseDef, color: '#facc15' },
                { label: 'C', value: baseSpa, color: '#3b82f6' },
                { label: 'D', value: baseSpd, color: '#10b981' },
                { label: 'S', value: baseSpe, color: '#ec4899' }
              ].map(stat => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '60px', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${stat.color}40` }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '900', color: stat.color }}>{stat.label}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#334155' }}>{stat.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '60px', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: `1px solid #cbd5e1`, marginTop: '2px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#64748b' }}>합</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0f172a' }}>{totalStats}</span>
              </div>
            </div>
          </div>
          {/* Calculator UI */}
          <div style={{ flex: 1.1, marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--glass-bg)', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)', alignSelf: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 스탯 계산기
                {isMatchupMode && oppStats && (
                  <span style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: calcSpe > oppStats.spe ? '#dcfce7' : (calcSpe < oppStats.spe ? '#fee2e2' : '#f1f5f9'), color: calcSpe > oppStats.spe ? '#15803d' : (calcSpe < oppStats.spe ? '#b91c1c' : '#475569') }}>
                    {calcSpe > oppStats.spe ? '⚡ 스피드 우위' : (calcSpe < oppStats.spe ? '🐢 스피드 열세' : '🤝 스피드 동률')}
                  </span>
                )}
              </h3>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
              {/* Left Column: Stats List + Durability Box */}
              <div style={{ flex: 2, display: 'flex', gap: '12px' }}>
                {/* Stats List (Single Column) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px', marginBottom: '2px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '46px', fontSize: '0.65rem', fontWeight: 'bold', color: '#64748b', flexShrink: 0 }}>종족값</div>
                    <div style={{ width: '46px', textAlign: 'center', fontSize: '0.65rem', fontWeight: 'bold', color: '#64748b', flexShrink: 0 }}>노력치</div>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ width: '32px', textAlign: 'right', fontSize: '0.65rem', fontWeight: 'bold', color: '#64748b', flexShrink: 0 }}>실수치</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { id: 'hp', label: 'HP', ev: calcEvs.hp, base: baseHp, calc: calcHp, color: '#ff5959' },
                      { id: 'atk', label: '공격', ev: calcEvs.atk, base: baseAtk, calc: calcAtk, color: '#f59e0b' },
                      { id: 'def', label: '방어', ev: calcEvs.def, base: baseDef, calc: calcDef, color: '#facc15' },
                      { id: 'spa', label: '특공', ev: calcEvs.spa, base: baseSpa, calc: calcSpa, color: '#3b82f6' },
                      { id: 'spd', label: '특방', ev: calcEvs.spd, base: baseSpd, calc: calcSpd, color: '#10b981' },
                      { id: 'spe', label: '스피드', ev: calcEvs.spe, base: baseSpe, calc: calcSpe, color: '#ec4899' }
                    ].map(stat => {
                      const isMax = stat.ev === 32;
                      const pct = (stat.ev / 32) * 100;
                      const trackBg = `linear-gradient(to right, ${stat.color} ${pct}%, #e2e8f0 ${pct}%)`;
                      const mult = getNatureMultForCalc(stat.id);
                      const labelColor = mult > 1 ? '#ef4444' : (mult < 1 ? '#3b82f6' : '#475569');
                      return (
                        <div key={stat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', width: '46px', lineHeight: 1.1, flexShrink: 0 }}>
                            <span style={{ fontWeight: 'bold', color: labelColor, whiteSpace: 'nowrap' }}>
                              {stat.label}
                              {mult > 1 && <span style={{ fontSize: '0.65rem' }}>↑</span>}
                              {mult < 1 && <span style={{ fontSize: '0.65rem' }}>↓</span>}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              {stat.base}
                            </span>
                          </div>
                          <input 
                            type="number" 
                            min="0" max="32" step="1" 
                            value={stat.ev} 
                            onChange={(e) => handleEvChange(stat.id, e.target.value)}
                            style={{ width: '46px', flexShrink: 0, padding: '2px 4px', border: isMax ? `1.5px solid ${stat.color}` : '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', color: isMax ? stat.color : '#0f172a', fontWeight: isMax ? 'bold' : 'normal', backgroundColor: isMax ? `${stat.color}15` : '#ffffff', outline: 'none' }}
                          />
                          <input 
                            type="range" 
                            className="calc-slider"
                            min="0" max="32" step="1"
                            value={stat.ev}
                            onChange={(e) => handleEvChange(stat.id, e.target.value)}
                            style={{ flex: 1, minWidth: '0', '--track-bg': trackBg, '--thumb-color': stat.color }}
                          />
                          <div style={{ width: '32px', textAlign: 'right', fontWeight: 'bold', color: stat.color, fontSize: '0.85rem', flexShrink: 0 }}>
                            {stat.calc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Durability & Speed Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '125px', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '2px' }}>
                    🛡️ 내구 & 스피드
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '170px' }}>
                    {/* 물리내구 카드 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(254, 242, 242, 0.4) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      boxShadow: '0 1px 3px rgba(239, 68, 68, 0.05)',
                      flex: 1,
                      justifyContent: 'flex-start'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        flexShrink: 0
                      }}>
                        🛡️
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        <span style={{ fontSize: '0.62rem', color: '#7f1d1d', fontWeight: 'bold', opacity: 0.7 }}>물리내구</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>{calcPhysDur.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 특수내구 카드 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(240, 253, 250, 0.4) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.15)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      boxShadow: '0 1px 3px rgba(16, 185, 129, 0.05)',
                      flex: 1,
                      justifyContent: 'flex-start'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        flexShrink: 0
                      }}>
                        ✨
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        <span style={{ fontSize: '0.62rem', color: '#064e3b', fontWeight: 'bold', opacity: 0.7 }}>특수내구</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>{calcSpecDur.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 스피드 카드 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.06) 0%, rgba(253, 244, 255, 0.4) 100%)',
                      border: '1px solid rgba(236, 72, 153, 0.15)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      boxShadow: '0 1px 3px rgba(236, 72, 153, 0.05)',
                      flex: 1,
                      justifyContent: 'flex-start'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        flexShrink: 0
                      }}>
                        👟
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        <span style={{ fontSize: '0.62rem', color: '#701a75', fontWeight: 'bold', opacity: 0.7 }}>스피드</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap' }}>
                          {calcSpe}
                          {hasScarf && <span style={{ color: '#ec4899', fontSize: '0.72rem', fontWeight: 'bold' }}> (🧣{calcScarfSpe})</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Split into Nature list and EV list */}
              {(topNatures.length > 0 || topStatPoints.length > 0) && (
                <div style={{ flex: 1.4, display: 'flex', gap: '8px', borderLeft: '1px solid rgba(0,0,0,0.08)', paddingLeft: '12px' }}>
                  {/* Nature List */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '2px' }}>
                      🧠 성격 순위
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '170px' }}>
                      {topNatures.slice(0, 3).map((n, idx) => {
                        const translation = natureTranslations[n.name] || n.name;
                        const pct = parseFloat(n.percentage_value ?? n.percentage ?? 0) || 0;
                        const isSelected = calcNature === n.name;
                        const info = natureStatsMap[n.name];
                        const bonusText = info ? `(${info.up}↑ ${info.down}↓)` : '';
                        return (
                          <div
                            key={idx}
                            onClick={() => setCalcNature(n.name)}
                            style={{
                              background: isSelected ? '#e0f2fe' : '#f1f5f9',
                              border: isSelected ? '1px solid #0284c7' : '1px solid transparent',
                              padding: '4px 6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              gap: '1px',
                              fontSize: '0.62rem',
                              transition: 'all 0.15s ease',
                              flex: 1,
                              minHeight: '34px',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                                e.currentTarget.style.background = '#e2e8f0';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = 'transparent';
                                e.currentTarget.style.background = '#f1f5f9';
                              }
                            }}
                            title="클릭하여 이 성격을 계산기에 적용"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.58rem', lineHeight: 1 }}>
                              <span style={{ color: isSelected ? '#0369a1' : 'var(--accent-primary)' }}>#{n.rank}</span>
                              <span style={{ color: '#64748b' }}>{pct.toFixed(1)}%</span>
                            </div>
                            <div style={{ color: isSelected ? '#0c4a6e' : '#0f172a', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '1px' }}>
                              {translation} <span style={{ color: '#64748b', fontSize: '0.55rem', fontWeight: 'normal' }}>{bonusText}</span>
                            </div>
                          </div>
                        );
                      })}
                      {topNatures.length === 0 && (
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>데이터 없음</div>
                      )}
                    </div>
                  </div>

                  {/* EV List */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '2px' }}>
                      ⚙️ 노력치 순위
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '170px' }}>
                      {topStatPoints.map((sp, idx) => {
                        const pct = parseFloat(sp.percentage_value ?? sp.percentage ?? 0) || 0;
                        const statKeys = [
                          { key: 'hp_points', label: 'H' },
                          { key: 'attack_points', label: 'A' },
                          { key: 'defense_points', label: 'B' },
                          { key: 'sp_atk_points', label: 'C' },
                          { key: 'sp_def_points', label: 'D' },
                          { key: 'speed_points', label: 'S' }
                        ];

                        const raw = {
                          hp: sp.hp_points || 0,
                          atk: sp.attack_points || 0,
                          def: sp.defense_points || 0,
                          spa: sp.sp_atk_points || 0,
                          spd: sp.sp_def_points || 0,
                          spe: sp.speed_points || 0
                        };

                        const isSelected = Object.keys(raw).every(k => calcEvs[k] === raw[k]);

                        const evParts = [];
                        statKeys.forEach(sk => {
                          const val = sp[sk.key];
                          if (val) {
                            const isMax = val === 32;
                            evParts.push(
                              <span key={sk.key} style={{ color: isSelected ? '#047857' : '#475569', fontWeight: isMax ? 'bold' : '500', marginRight: '3px' }}>
                                {sk.label}{val}
                              </span>
                            );
                          }
                        });
                        const evNode = evParts.length > 0 ? evParts : <span style={{ color: '#94a3b8' }}>무진동</span>;
                        const labelText = statKeys.map(sk => sp[sk.key] ? `${sk.label}${sp[sk.key]}` : '').filter(Boolean).join(' ') || '무진동';

                        return (
                          <div
                            key={idx}
                            onClick={() => setCalcEvs(raw)}
                            style={{
                              background: isSelected ? '#d1fae5' : '#f1f5f9',
                              border: isSelected ? '1px solid #10b981' : '1px solid transparent',
                              padding: '4px 6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              gap: '1px',
                              fontSize: '0.65rem',
                              transition: 'all 0.15s ease',
                              flex: 1,
                              minHeight: '34px',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                                e.currentTarget.style.background = '#e2e8f0';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = 'transparent';
                                e.currentTarget.style.background = '#f1f5f9';
                              }
                            }}
                            title="클릭하여 이 노력치를 계산기에 적용"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.58rem', lineHeight: 1 }}>
                              <span style={{ color: isSelected ? '#047857' : 'var(--accent-primary)' }}>#{sp.rank}</span>
                              <span style={{ color: '#64748b' }}>{pct.toFixed(1)}%</span>
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }} title={labelText}>
                              {evNode}
                            </div>
                          </div>
                        );
                      })}
                      {topStatPoints.length === 0 && (
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>데이터 없음</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== ROW 1: Matchups, Items, Abilities ===== */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Matchups */}
          <div className="dp2-section" style={{ flex: 1 }}>
            <h3 className="dp2-section-title">🛡️ 타입 상성</h3>
            <div className="dp2-matchups-body">
              {renderMatchupRow('×4', '4', 'dp2-row-4x')}
              {renderMatchupRow('×2', '2', 'dp2-row-2x')}
              {renderMatchupRow('½', '0.5', 'dp2-row-half')}
              {renderMatchupRow('¼', '0.25', 'dp2-row-quarter')}
              {renderMatchupRow('×0', '0', 'dp2-row-immune')}
              {Object.values(matchupGroups).every(arr => arr.length === 0) && (
                <div style={{textAlign:'center', padding:'8px', color:'#94a3b8', fontSize:'0.8rem'}}>상성 데이터 없음</div>
              )}
            </div>
          </div>
          
          {/* Items */}
          <div className="dp2-section" style={{ flex: 1 }}>
            <h3 className="dp2-section-title">🎒 주요 도구</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topItems.slice(0, 3).map((it, idx) => {
                const info = itemNames[it.name] || {};
                const pct = getPct(it);
                const pctStyle = getPctStyle(pct);
                const itemBadges = getItemBadges(it.name);
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.02)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {info.sprite && <img src={info.sprite} alt="" style={{width: '24px', height: '24px', imageRendering: 'pixelated'}} />}
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{info.name || it.name}</span>
                      {itemBadges && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {itemBadges.map((b, bIdx) => (
                            <span key={bIdx} style={{ fontSize: '0.65rem', padding: '2px 6px', background: b.color, color: b.textColor || '#fff', borderRadius: '4px', fontWeight: 'bold', border: b.textColor ? '1px solid #cbd5e1' : 'none' }}>
                              {b.text}
                            </span>
                          ))}
                        </div>
                      )}
                      {!itemBadges && info.flavor && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{info.flavor.replace(/\n|\f/g, ' ')}</span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', ...pctStyle }}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
              {topItems.length === 0 && <div style={{textAlign:'center', padding:'8px', color:'#94a3b8', fontSize:'0.8rem'}}>데이터 없음</div>}
            </div>
          </div>

          {/* Abilities */}
          <TopAbilitiesBox topAbilities={topAbilities} containerStyle={{ flex: 1 }} />
        </div>

        {/* ===== ROW 2: MOVES (Split into Attack and Status) ===== */}
        {isMatchupMode && oppStats && (
           <div style={{ fontSize: '0.75rem', background: '#fef3c7', padding: '6px 10px', borderRadius: '6px', color: '#b45309', border: '1px solid #fde68a', marginTop: '4px' }}>
             💡 <b>대면 분석 모드:</b> 공격 기술의 데미지는 상대 포켓몬의 <b>스탯 계산기 기준 물리/특수 내구</b>를 바탕으로 산출됩니다.
           </div>
        )}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          
          {/* ATTACK MOVES */}
          <div className="dp2-section" style={{ flex: 3 }}>
            <h3 className="dp2-section-title" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚔️ 공격 기술 
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                  {calcBadges.map((badge, idx) => (
                    <span key={idx} style={{ 
                      display: 'flex', alignItems: 'center', gap: '2px', 
                      fontSize: '0.65rem', padding: '2px 6px', 
                      background: `${badge.color}15`, color: badge.color, 
                      borderRadius: '4px', border: `1px solid ${badge.color}40`, 
                      fontWeight: 'bold', whiteSpace: 'nowrap'
                    }}>
                      {badge.sprite && <img src={badge.sprite} alt="" style={{ width: '12px', height: '12px', imageRendering: 'pixelated' }} />}
                      {badge.text.replace(/^[^\w가-힣]+/, '').trim()}
                    </span>
                  ))}
                </div>
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div 
                  onClick={() => setIsRankGuideOpen(true)}
                  title="랭크 배율 가이드"
                  style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', cursor: 'inherit' }}>랭크</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--glass-bg)', padding: '2px 4px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                  
                  {/* Leftmost Dropdown: -3 to -6 */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenRankDropdown(prev => prev === 'neg' ? null : 'neg')}
                      style={{
                        width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer',
                        background: offenseRank <= -3 ? '#3b82f6' : 'transparent', color: offenseRank <= -3 ? '#fff' : '#cbd5e1',
                        transition: 'all 0.15s ease'
                      }}
                      title={offenseRank <= -3 ? `${offenseRank}랭크 (${Math.round(2/(2-offenseRank)*100)}%)` : `-3랭크 이하`}
                    >
                      {offenseRank <= -3 ? offenseRank : '3-'}
                    </button>
                    {openRankDropdown === 'neg' && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '2px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px' }}>
                        {[-3, -4, -5, -6].map(r => (
                          <button key={r} onClick={() => { setOffenseRank(r); setOpenRankDropdown(null); }} style={{ width: '28px', height: '20px', fontSize: '0.65rem', fontWeight: 'bold', border: 'none', background: offenseRank === r ? '#3b82f6' : 'transparent', color: offenseRank === r ? '#fff' : '#475569', borderRadius: '2px', cursor: 'pointer' }}>
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Middle Buttons */}
                  {[-2, -1, 0, 1, 2].map(rank => (
                    <button
                      key={rank}
                      onClick={() => { setOffenseRank(rank); setOpenRankDropdown(null); }}
                      style={{
                        width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer',
                        background: offenseRank === rank ? (rank > 0 ? '#ef4444' : rank < 0 ? '#3b82f6' : '#64748b') : 'transparent',
                        color: offenseRank === rank ? '#fff' : (rank === 0 ? '#94a3b8' : '#cbd5e1'),
                        transition: 'all 0.15s ease'
                      }}
                      title={(() => {
                        let pct = rank > 0 ? (2 + rank) / 2 : 2 / (2 - rank);
                        return `${rank > 0 ? '+' : ''}${rank}랭크 (${Math.round(pct * 100)}%)`;
                      })()}
                    >
                      {rank === 0 ? '-' : Math.abs(rank)}
                    </button>
                  ))}

                  {/* Rightmost Dropdown: +3 to +6 */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenRankDropdown(prev => prev === 'pos' ? null : 'pos')}
                      style={{
                        width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer',
                        background: offenseRank >= 3 ? '#ef4444' : 'transparent', color: offenseRank >= 3 ? '#fff' : '#cbd5e1',
                        transition: 'all 0.15s ease'
                      }}
                      title={offenseRank >= 3 ? `+${offenseRank}랭크 (${Math.round((2+offenseRank)/2*100)}%)` : `+3랭크 이상`}
                    >
                      {offenseRank >= 3 ? `+${offenseRank}` : '3+'}
                    </button>
                    {openRankDropdown === 'pos' && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '2px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px' }}>
                        {[3, 4, 5, 6].map(r => (
                          <button key={r} onClick={() => { setOffenseRank(r); setOpenRankDropdown(null); }} style={{ width: '28px', height: '20px', fontSize: '0.65rem', fontWeight: 'bold', border: 'none', background: offenseRank === r ? '#ef4444' : 'transparent', color: offenseRank === r ? '#fff' : '#475569', borderRadius: '2px', cursor: 'pointer' }}>
                            +{r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="dp2-table dp2-move-table">
                <thead>
                  <tr>
                    <th style={{width:'3%'}}></th>
                    <th style={{width:'28%'}}>기술명</th>
                    <th style={{width:'6%'}}>위력</th>
                    <th style={{width:'6%'}}>명중</th>
                    <th style={{width:'27%'}}>결정력</th>
                    <th style={{width:'30%'}}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {allMoveRows.filter(m => {
                    const info = moveDetails[m.name] || {};
                    return info.damageClass === 'physical' || info.damageClass === 'special';
                  }).map((m, idx) => {
                    const info = moveDetails[m.name] || {};
                    const pct = getPct(m);
                    const pctStyle = getPctStyle(pct);
                    const isStab = types.some(t => t.toLowerCase() === (info.type || '').toLowerCase());
                    const isPhysicalMove = info.damageClass === 'physical';
                    const isSpecialMove = info.damageClass === 'special';

                    const nameColor = typeColors[info.type] || '#1e293b';

                    let powerColor = '#64748b'; // Default Gray (< 40)
                    if (info.power >= 120) powerColor = '#dc2626'; // Red
                    else if (info.power >= 100) powerColor = '#f97316'; // Orange
                    else if (info.power >= 80) powerColor = '#eab308'; // Yellow
                    else if (info.power >= 60) powerColor = '#3b82f6'; // Blue
                    else if (info.power >= 40) powerColor = '#22c55e'; // Green

                    // Firepower calc
                    let baseDmg = null;
                    let standardDmg = null;
                    let dmgVariants = [];
                    if (info.power > 0) {
                      const totalPower = getMoveTotalPower(info);
                      let stat = isPhysicalMove ? calcAtk : calcSpa;
                      
                      // Apply Offense Rank (Stat Stage) Modifier
                      if (offenseRank > 0) stat = Math.floor(stat * ((2 + offenseRank) / 2));
                      else if (offenseRank < 0) stat = Math.floor(stat * (2 / (2 - offenseRank)));
                      
                      // Move Flags
                      const moveFlags = info.englishName ? (moveFlagsData[info.englishName] || {}) : {};
                      
                      let moveTypeForCalc = (info.type || '').toLowerCase();
                      let finalPowerMult = 1.0;
                      let stabMult = types.some(t => t.toLowerCase() === moveTypeForCalc) ? 1.5 : 1.0;

                      // Apply Ability
                      if (activeAbilityMeta) {
                        if (activeAbilityMeta.type === 'stab') {
                          if (stabMult > 1) stabMult = activeAbilityMeta.mult;
                        } else if (activeAbilityMeta.type === 'skin') {
                          if (moveTypeForCalc === 'normal') {
                            moveTypeForCalc = activeAbilityMeta.newType;
                            finalPowerMult *= activeAbilityMeta.mult;
                            // Check new STAB
                            if (types.some(t => t.toLowerCase() === moveTypeForCalc)) stabMult = 1.5;
                          }
                        } else if (activeAbilityMeta.type === 'power') {
                          let applyBoost = false;
                          const cond = activeAbilityMeta.condition;
                          if (cond === 'all') applyBoost = true;
                          else if (cond === 'contact' && moveFlags.contact) applyBoost = true;
                          else if (cond === 'punch' && moveFlags.punch) applyBoost = true;
                          else if (cond === 'bite' && moveFlags.bite) applyBoost = true;
                          else if (cond === 'pulse' && moveFlags.pulse) applyBoost = true;
                          else if (cond === 'sound' && moveFlags.sound) applyBoost = true;
                          else if (cond === 'secondary' && moveFlags.secondary) applyBoost = true;
                          else if (cond === 'power<=60' && info.power <= 60) applyBoost = true;
                          else if (cond.startsWith('type:')) {
                            const targetTypes = cond.split(':')[1].split(',');
                            if (targetTypes.includes(moveTypeForCalc)) applyBoost = true;
                          }
                          if (applyBoost) finalPowerMult *= activeAbilityMeta.mult;
                        }
                      }
                      
                      const effectivePower = Math.floor(totalPower * finalPowerMult);
                      baseDmg = Math.floor(effectivePower * stat * stabMult);

                      dmgBoostItems.forEach(item => {
                        let apply = false;
                        if (item.meta.type === 'all') apply = true;
                        else if (item.meta.type === 'physical' && isPhysicalMove) apply = true;
                        else if (item.meta.type === 'special' && isSpecialMove) apply = true;
                        else if (item.meta.type === moveTypeForCalc) apply = true;

                        if (apply) {
                          dmgVariants.push({
                            ...item,
                            dmg: Math.floor(baseDmg * item.meta.mult)
                          });
                        }
                      });

                      let top1Mult = 1.0;
                      if (topItems.length > 0) {
                        const top1Meta = damageItems[topItems[0].name];
                        if (top1Meta) {
                          let apply = false;
                          if (top1Meta.type === 'all') apply = true;
                          else if (top1Meta.type === 'physical' && isPhysicalMove) apply = true;
                          else if (top1Meta.type === 'special' && isSpecialMove) apply = true;
                          else if (top1Meta.type === moveTypeForCalc) apply = true;
                          if (apply) top1Mult = top1Meta.mult;
                        }
                      }
                      standardDmg = Math.floor(baseDmg * top1Mult);
                    }

                      // Apply Matchup Damage Calculation
                      let matchupDamage = null;
                      if (isMatchupMode && oppStats && info.power > 0) {
                        matchupDamage = calcDamageRange({
                          power: getMoveTotalPower(info),
                          moveType: info.type,
                          damageClass: info.damageClass,
                          attackerAtk: stat, // This already has stat stages applied
                          defenderDef: isPhysicalMove ? oppStats.def : oppStats.spd,
                          defenderHP: oppStats.hp,
                          attackerTypes: types,
                          defenderTypes: oppTypes,
                          abilityKo: activeAbilityMeta ? Object.keys(abilityBoosts).find(k => abilityBoosts[k].type === activeAbilityMeta.type && abilityBoosts[k].mult === activeAbilityMeta.mult) : '', // Approximation, but since finalAtk handles basic boosts, maybe empty is fine. Or use top1 ability
                          itemName: topItems.length > 0 ? topItems[0].name : '',
                          moveEngName: info.englishName
                        });
                      }

                      const notes = info.power > 0 ? getMoveNotes(info) : [];

                      return (
                        <tr key={idx}>
                          <td>
                            <img src={getPokeApiTypeIconUrl(info.type)} alt={info.type} title={getTypeKo(info.type)} className="dp2-move-type-icon" />
                          </td>
                          <td>
                            <div className="dp2-move-name-cell" style={{ position: 'relative' }}>
                              <span className={`dp2-move-name ${isStab ? 'dp2-stab' : ''}`} style={{ color: nameColor, fontWeight: 'bold' }}>
                                {info.damageClass === 'physical' && '⚔ '}
                                {info.damageClass === 'special' && '✦ '}
                                {info.name || m.name}
                              </span>
                              {info.priority !== 0 && (
                                <span className={`dp2-priority-badge ${info.priority > 0 ? 'dp2-priority-plus' : 'dp2-priority-minus'}`}>
                                  {info.priority > 0 ? `+${info.priority}` : info.priority}
                                </span>
                              )}
                              {pct > 0 ? (
                                <span className="dp2-move-pct" style={pctStyle}>{pct.toFixed(1)}%</span>
                              ) : (
                                <span className="dp2-move-pct" style={{ ...pctStyle, color: '#94a3b8' }}>순위 외</span>
                              )}
                            </div>
                          </td>
                          <td style={{fontSize:'0.8rem', color: powerColor, fontWeight: info.power >= 80 ? 'bold' : 'normal'}}>
                            {info.power > 0 ? getMovePowerDisplay(info) : '-'}
                          </td>
                          <td style={{fontSize:'0.75rem', color: info.accuracy && info.accuracy < 100 ? '#f97316' : '#64748b'}}>
                            {info.accuracy ?? '-'}
                          </td>
                          <td style={{padding: '4px', position: 'relative'}}>
                            {isMatchupMode && oppStats && matchupDamage ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: matchupDamage.minPct >= 100 ? '#dc2626' : '#1e293b' }}>
                                    {matchupDamage.minPct}% ~ {matchupDamage.maxPct}%
                                  </span>
                                  <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold', 
                                    background: matchupDamage.koMin === 1 ? '#fee2e2' : (matchupDamage.koMax === 1 ? '#ffedd5' : '#f1f5f9'), 
                                    color: matchupDamage.koMin === 1 ? '#dc2626' : (matchupDamage.koMax === 1 ? '#c2410c' : '#64748b') 
                                  }}>
                                    {matchupDamage.isImmune ? '효과 없음' : 
                                     matchupDamage.koMin === 1 ? '확정 1타' : 
                                     matchupDamage.koMax === 1 ? '난수 1타' : 
                                     matchupDamage.koMin === 2 ? '확정 2타' :
                                     matchupDamage.koMax === 2 ? '난수 2타' : '3타 이상'}
                                  </span>
                                </div>
                                <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(matchupDamage.maxPct, 100)}%`, height: '100%', background: matchupDamage.minPct >= 100 ? '#dc2626' : '#f59e0b' }} />
                                </div>
                              </div>
                            ) : (
                              standardDmg ? (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '8px', width: '100%', minHeight: '28px' }}>
                                  <div className="dp2-move-bar-bg" style={{ borderRadius: '6px' }}>
                                    <div className="dp2-move-bar-fill" style={{ width: `${Math.min((standardDmg / 50000) * 100, 100)}%`, background: `${typeColors[info.type] || '#94a3b8'}40`, borderRadius: '6px' }} />
                                  </div>
                                  <div className="dp2-dmg-group" style={{ position: 'relative', zIndex: 1 }}>
                                    <div className="dp2-dmg-base">{standardDmg.toLocaleString()}</div>
                                  </div>
                                </div>
                              ) : '-'
                            )}
                          </td>
                        <td>
                          <div className="dp2-notes-cell">
                            {notes.map((n, i) => (
                              <span key={i} className="dp2-note-badge" style={{ background: `${n.color}20`, color: n.color }}>{n.text}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* STATUS MOVES */}
          <div className="dp2-section" style={{ flex: 2 }}>
            <h3 className="dp2-section-title">◈ 변화기</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="dp2-table dp2-move-table">
                <thead>
                  <tr>
                    <th style={{width:'5%'}}></th>
                    <th style={{width:'35%'}}>기술명</th>
                    <th style={{width:'15%'}}>명중</th>
                    <th style={{width:'45%'}}>효과</th>
                  </tr>
                </thead>
                <tbody>
                  {allMoveRows.filter(m => {
                    const info = moveDetails[m.name] || {};
                    return info.damageClass === 'status';
                  }).map((m, idx) => {
                    const info = moveDetails[m.name] || {};
                    const pct = getPct(m);
                    
                    const notes = getMoveNotes(info);
                    if (notes.length === 0 && (info.flavorText || info.flavor)) {
                      notes.push({ text: '특수효과', color: '#64748b', tooltip: (info.flavorText || info.flavor).replace(/\n|\f/g, ' ') });
                    }
                    
                    return (
                      <tr key={idx} className="dp2-status-row">
                        <td>
                          <img src={getPokeApiTypeIconUrl(info.type)} alt={info.type} title={getTypeKo(info.type)} className="dp2-move-type-icon" />
                        </td>
                        <td>
                          <div className="dp2-move-name-cell">
                            <span className="dp2-move-name" style={{ color: '#64748b' }}>
                              ◈ {info.name || m.name}
                            </span>
                            {pct > 0 ? (
                              <span className="dp2-move-pct">{pct.toFixed(1)}%</span>
                            ) : (
                              <span className="dp2-move-pct" style={{ color: '#94a3b8' }}>순위 외</span>
                            )}
                          </div>
                        </td>
                        <td style={{fontSize:'0.75rem', color: info.accuracy && info.accuracy < 100 ? '#f97316' : '#64748b'}}>
                          {info.accuracy ?? '-'}
                        </td>
                        <td>
                          <div className="dp2-notes-cell" style={{ flexWrap: 'wrap', gap: '4px' }}>
                            {notes.map((n, i) => (
                              <span 
                                key={i} 
                                className="dp2-note-badge" 
                                title={n.tooltip}
                                style={{ 
                                  background: `${n.color}20`, 
                                  color: n.color,
                                  cursor: n.tooltip ? 'help' : 'default'
                                }}
                              >
                                {n.text}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {allMoveRows.filter(m => (moveDetails[m.name] || {}).damageClass === 'status').length === 0 && (
                    <tr><td colSpan="4" style={{padding:'12px', textAlign:'center', color:'#94a3b8'}}>변화기 데이터 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ===== TEAMMATES ===== */}
        <div className="dp2-section">
          <h3 className="dp2-section-title">🤝 동반 선출</h3>
          <div className="dp2-teammates">
            {topTeammates.length > 0 ? topTeammates.map((tm, idx) => (
              <div
                key={tm.name}
                className="dp2-teammate-item"
                onClick={() => onSuggestionClick && onSuggestionClick(tm.name)}
                title={`${getPokemonKo(tm.name)} 상세 보기`}
              >
                <img src={apiService.getSpriteUrl(tm.name)} alt={tm.name} className="dp2-teammate-sprite" />
                <div className="dp2-teammate-info">
                  <span className="dp2-teammate-name">{getPokemonKo(tm.name)}</span>
                  <span className="dp2-teammate-pct" style={{ ...getPctStyle(tm.pct), fontSize: '0.8rem' }}>{tm.pct.toFixed(1)}%</span>
                </div>
              </div>
            )) : (
              <div style={{textAlign:'center', padding:'12px', color:'#94a3b8', fontSize:'0.8rem'}}>데이터 없음</div>
            )}
          </div>
        </div>

      </div>

      {isRankGuideOpen && (
        <div 
          onClick={() => setIsRankGuideOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>랭크별 결정력 배율 가이드</h3>
              <button onClick={() => setIsRankGuideOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <table className="dp2-table" style={{ width: '100%', textAlign: 'center', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f8fafc', padding: '8px' }}>랭크</th>
                  <th style={{ background: '#f8fafc', padding: '8px' }}>분수</th>
                  <th style={{ background: '#f8fafc', padding: '8px' }}>배율</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ color: '#ef4444', fontWeight: 'bold' }}>+6</td><td>8/2</td><td>400%</td></tr>
                <tr><td style={{ color: '#ef4444', fontWeight: 'bold' }}>+5</td><td>7/2</td><td>350%</td></tr>
                <tr><td style={{ color: '#ef4444', fontWeight: 'bold' }}>+4</td><td>6/2</td><td>300%</td></tr>
                <tr><td style={{ color: '#ef4444', fontWeight: 'bold' }}>+3</td><td>5/2</td><td>250%</td></tr>
                <tr><td style={{ color: '#ef4444', fontWeight: 'bold' }}>+2</td><td>4/2</td><td>200%</td></tr>
                <tr><td style={{ color: '#ef4444', fontWeight: 'bold' }}>+1</td><td>3/2</td><td>150%</td></tr>
                <tr style={{ background: '#f1f5f9' }}><td style={{ fontWeight: 'bold' }}>0</td><td>2/2</td><td>100%</td></tr>
                <tr><td style={{ color: '#3b82f6', fontWeight: 'bold' }}>-1</td><td>2/3</td><td>67%</td></tr>
                <tr><td style={{ color: '#3b82f6', fontWeight: 'bold' }}>-2</td><td>2/4</td><td>50%</td></tr>
                <tr><td style={{ color: '#3b82f6', fontWeight: 'bold' }}>-3</td><td>2/5</td><td>40%</td></tr>
                <tr><td style={{ color: '#3b82f6', fontWeight: 'bold' }}>-4</td><td>2/6</td><td>33%</td></tr>
                <tr><td style={{ color: '#3b82f6', fontWeight: 'bold' }}>-5</td><td>2/7</td><td>29%</td></tr>
                <tr><td style={{ color: '#3b82f6', fontWeight: 'bold' }}>-6</td><td>2/8</td><td>25%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </main>
  );
}

export default DetailPanel;
