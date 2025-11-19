const fs = require('fs');
const path = require('path');

// Directories to exclude from counting
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build'];

// File extensions to count
const CODE_EXTENSIONS = {
  '.js': 'JavaScript',
  '.lua': 'Lua',
  '.json': 'JSON',
  '.md': 'Markdown'
};

/**
 * Recursively count lines of code in files
 * @param {string} dirPath - Directory path to scan
 * @param {Object} stats - Statistics object to accumulate results
 */
function countLinesInDirectory(dirPath, stats) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip excluded directories
      if (EXCLUDED_DIRS.includes(item)) {
        continue;
      }
      countLinesInDirectory(fullPath, stats);
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      
      // Only count files with recognized extensions
      if (CODE_EXTENSIONS[ext]) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').length;
        
        if (!stats[ext]) {
          stats[ext] = {
            name: CODE_EXTENSIONS[ext],
            files: 0,
            lines: 0
          };
        }
        
        stats[ext].files++;
        stats[ext].lines += lines;
      }
    }
  }
}

/**
 * Display the line count statistics
 * @param {Object} stats - Statistics object with line counts
 */
function displayStats(stats) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Lines of Code Statistics');
  console.log('='.repeat(60) + '\n');

  let totalFiles = 0;
  let totalLines = 0;

  // Sort by line count (descending)
  const sortedStats = Object.entries(stats).sort((a, b) => b[1].lines - a[1].lines);

  console.log('Language'.padEnd(15) + 'Files'.padEnd(10) + 'Lines');
  console.log('-'.repeat(60));

  for (const [ext, data] of sortedStats) {
    console.log(
      data.name.padEnd(15) +
      data.files.toString().padEnd(10) +
      data.lines.toLocaleString()
    );
    totalFiles += data.files;
    totalLines += data.lines;
  }

  console.log('-'.repeat(60));
  console.log(
    'Total'.padEnd(15) +
    totalFiles.toString().padEnd(10) +
    totalLines.toLocaleString()
  );
  console.log('='.repeat(60) + '\n');
}

// Main execution
const projectRoot = path.join(__dirname, '..');
const stats = {};

console.log('🔍 Scanning project for code files...');
console.log(`📁 Root directory: ${projectRoot}`);
console.log(`🚫 Excluding: ${EXCLUDED_DIRS.join(', ')}\n`);

countLinesInDirectory(projectRoot, stats);
displayStats(stats);
