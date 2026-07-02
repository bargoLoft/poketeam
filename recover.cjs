const fs = require('fs');

const transcriptPath = '/Users/bargo/.gemini/antigravity/brain/07ba7823-3077-4228-9e25-7bd700bc6638/.system_generated/logs/transcript_full.jsonl';
const logLines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(l => l.trim() !== '');

let content = fs.readFileSync('/Users/bargo/Documents/antigravity/poketeam/src/components/PartyDashboard.jsx', 'utf8');

function parseArg(val) {
  if (typeof val !== 'string') return val;
  try {
    let parsed = JSON.parse(val);
    if (typeof parsed === 'string') return parsed;
    return val;
  } catch(e) {
    return val;
  }
}

for (const line of logLines) {
  try {
    const step = JSON.parse(line);
    if (step.tool_calls) {
      for (const call of step.tool_calls) {
        if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
          let args = call.args;
          const targetFile = parseArg(args.TargetFile);
          
          if (targetFile && targetFile.includes('PartyDashboard.jsx')) {
            if (call.name === 'replace_file_content') {
              const targetContent = parseArg(args.TargetContent);
              const replacementContent = parseArg(args.ReplacementContent);
              if (content.includes(targetContent)) {
                content = content.replace(targetContent, replacementContent);
              } else {
                console.log('Could not find target content for a replace_file_content call!');
              }
            } else {
              let chunks = parseArg(args.ReplacementChunks);
              if (typeof chunks === 'string') chunks = JSON.parse(chunks);
              for (const chunk of chunks) {
                if (content.includes(chunk.TargetContent)) {
                  content = content.replace(chunk.TargetContent, chunk.ReplacementContent);
                } else {
                  console.log('Could not find target content for a chunk!');
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
  }
}

fs.writeFileSync('/Users/bargo/Documents/antigravity/poketeam/src/components/PartyDashboard.jsx', content);
console.log('Recovery completed! File lines:', content.split('\n').length);
