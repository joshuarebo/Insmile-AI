const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Verifying Insmile AI installation requirements...\n');

// Function to display check result
function displayCheck(name, success, message) {
  const status = success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${status} ${name}${message ? ': ' + message : ''}`);
  return success;
}

// Check Node.js version
try {
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.substring(1).split('.')[0]);
  displayCheck('Node.js version', major >= 14, `${nodeVersion} (${major >= 14 ? 'OK' : 'Node.js 14+ required'})`);
} catch (error) {
  displayCheck('Node.js version', false, 'Unable to determine Node.js version');
}

// Check NPM 
try {
  const npmVersion = execSync('npm -v').toString().trim();
  displayCheck('NPM version', true, npmVersion);
} catch (error) {
  displayCheck('NPM version', false, 'Unable to determine NPM version');
}

// Check AWS config exists
const awsConfigPath = path.join(__dirname, 'server', 'config', 'aws.json');
const awsExamplePath = path.join(__dirname, 'server', 'config', 'aws.example.json');

let hasAwsConfig = false;
if (fs.existsSync(awsConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(awsConfigPath, 'utf8'));
    const hasValidCredentials = 
      config.credentials && 
      config.credentials.accessKeyId &&
      config.credentials.accessKeyId !== 'YOUR_AWS_ACCESS_KEY_ID' &&
      config.credentials.secretAccessKey && 
      config.credentials.secretAccessKey !== 'YOUR_AWS_SECRET_ACCESS_KEY';
    
    hasAwsConfig = true;
    displayCheck('AWS configuration', true, hasValidCredentials ? 'Found with credentials' : 'Found but credentials may need to be updated');
  } catch (error) {
    displayCheck('AWS configuration', false, 'Found but invalid JSON format');
  }
} else if (fs.existsSync(awsExamplePath)) {
  displayCheck('AWS configuration', false, 'Not found, but example config exists. Copy aws.example.json to aws.json and add your credentials');
} else {
  displayCheck('AWS configuration', false, 'Not found. Create server/config/aws.json with your AWS credentials');
}

// Check if required directories exist
const requiredDirs = [
  'server/uploads',
  'server/public',
  'client/public'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    displayCheck(`Directory: ${dir}`, true, 'Created');
  } else {
    displayCheck(`Directory: ${dir}`, true, 'Exists');
  }
});

// Check for required package.json files
['package.json', 'server/package.json', 'client/package.json'].forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    displayCheck(`Required file: ${file}`, true, 'Exists');
  } else {
    displayCheck(`Required file: ${file}`, false, 'Missing');
  }
});

// Check if node_modules directories exist
['node_modules', 'server/node_modules', 'client/node_modules'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    displayCheck(`Dependencies: ${dir}`, true, 'Installed');
  } else {
    displayCheck(`Dependencies: ${dir}`, false, 'Not installed. Run "npm run install:all"');
  }
});

console.log('\nVerification complete!');

if (!hasAwsConfig) {
  console.log('\n\x1b[33mIMPORTANT:\x1b[0m');
  console.log('You need to set up your AWS credentials before running the application.');
  console.log('See the README.md file for instructions on how to get and configure AWS credentials.');
}

console.log('\nTo start the application:');
console.log('1. Run "npm run install:all" if you haven\'t installed dependencies');
console.log('2. Run "npm start" to launch both the server and client\n'); 