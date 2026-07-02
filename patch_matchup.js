import fs from 'fs';
let code = fs.readFileSync('src/components/PartyDashboard.jsx', 'utf8');

// 1. Add import if not exists
if (!code.includes("import { getDefensiveMultiplier }")) {
  code = code.replace(
    /import React, \{ useState, useMemo \} from 'react';/,
    `import React, { useState, useMemo } from 'react';\nimport { getDefensiveMultiplier } from '../data/typeMatchups';`
  );
}

// 2. Modify getLeadData signature
code = code.replace(
  /const getLeadData = \(partyList, megaList\) => \{/,
  `const getLeadData = (partyList, megaList, targetParty = []) => {`
);

// 3. Add matchup bonus logic right after calculating score from rows
const matchupLogic = `
      // Add Type Matchup Synergy against Target Party
      if (targetParty.length > 0 && p.summary && p.summary.types) {
        let matchupBonus = 0;
        const myDefMults = getDefensiveMultiplier(p.summary.types);
        
        targetParty.forEach(target => {
          if (target && target.summary && target.summary.types) {
            // Defensive Synergy: Target attacking me
            target.summary.types.forEach(tType => {
              const mult = myDefMults[tType] || 1;
              if (mult > 1) matchupBonus -= 0.4;
              if (mult < 1) matchupBonus += 0.2;
              if (mult === 0) matchupBonus += 0.5;
            });
            
            // Offensive Synergy: Me attacking Target
            const targetDefMults = getDefensiveMultiplier(target.summary.types);
            p.summary.types.forEach(mType => {
              const mult = targetDefMults[mType] || 1;
              if (mult > 1) matchupBonus += 0.4;
              if (mult < 1) matchupBonus -= 0.2;
              if (mult === 0) matchupBonus -= 0.4;
            });
          }
        });
        
        // Normalize and weigh
        score += (matchupBonus / targetParty.length) * 1.5;
      }
      
      roles.sort((a, b) => a.priority - b.priority);`;

code = code.replace(
  /\s*roles\.sort\(\(a, b\) => a\.priority - b\.priority\);/,
  matchupLogic
);

// 4. Update the calls to getLeadData
code = code.replace(
  /\{getLeadData\(party, partyMegas\)\.map/g,
  `{getLeadData(party, partyMegas, opponentParty).map`
);
code = code.replace(
  /\{getLeadData\(opponentParty, opponentPartyMegas\)\.map/g,
  `{getLeadData(opponentParty, opponentPartyMegas, party).map`
);

fs.writeFileSync('src/components/PartyDashboard.jsx', code);
console.log("Patched matchup score successfully");
