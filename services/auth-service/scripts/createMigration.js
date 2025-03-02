const { execSync } = require('child_process');

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Error: Migration name is required!');
  process.exit(1);
}

const command = `yarn typeorm migration:create migrations/${migrationName}`;
console.log(`🚀 Running: ${command}`);

try {
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Migration creation failed:', error.message);
  process.exit(1);
}
