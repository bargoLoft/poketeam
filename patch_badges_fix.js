import fs from 'fs';
let code = fs.readFileSync('src/components/PartyDashboard.jsx', 'utf8');

// Change lead.roles.map to lead.roles.slice(0, 6).map and add textShadow
code = code.replace(
  /\{lead\.roles\.map\(\(role, rIdx\) => \([\s\S]*?color: 'white',[\s\S]*?\}\) => \(/g,
  (match) => match
); // Wait, Regex replacement over multiple lines is risky. I will use exact string replacement.

