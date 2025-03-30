# Packaging Insmile AI for Distribution

This document provides instructions on how to prepare and package the Insmile AI application for sale to dental practices.

## Preparation Steps

### 1. Remove Personal AWS Credentials

Before packaging, ensure you've removed any personal AWS credentials:

```bash
# Make a backup of your working AWS credentials if needed
cp server/config/aws.json server/config/aws.json.backup

# Reset the aws.json file to the example template
cp server/config/aws.example.json server/config/aws.json
```

### 2. Clean the Project

Remove unnecessary files and development artifacts:

```bash
# Remove node_modules directories
rm -rf node_modules
rm -rf client/node_modules
rm -rf server/node_modules

# Remove any test uploads
rm -rf server/uploads/*
touch server/uploads/.gitkeep

# Remove any logs
rm -rf logs
rm -rf *.log
```

### 3. Update Version Information

Edit the version in package.json to reflect your current release.

### 4. Create Distribution Package

Create a zip file containing the application:

```bash
# Create a clean distribution directory
mkdir -p dist

# Copy only necessary files
cp -r client dist/
cp -r server dist/
cp LICENSE dist/
cp README.md dist/
cp INSTRUCTIONS.md dist/
cp package.json dist/
cp package-lock.json dist/

# Remove unnecessary development files
rm -rf dist/client/.git
rm -rf dist/server/.git
rm -rf dist/client/.vscode
rm -rf dist/server/.vscode

# Create the distribution zip file
cd dist
zip -r InsmileAI-v1.0.0.zip *
cd ..
```

## Licensing and Customer Setup

### License Keys (Future Enhancement)

For a more secure licensing system, consider implementing:

1. A license key generation system
2. Server-side validation of license keys
3. Time-limited trials with automatic expiration

### Installation Verification

Create a simple verification script that customers can run to ensure their system meets all requirements:

```javascript
// verify.js - Add this to the package root
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Verifying Insmile AI installation requirements...');

// Check Node.js version
const nodeVersion = process.version;
console.log(`Node.js version: ${nodeVersion}`);
if (parseInt(nodeVersion.substring(1).split('.')[0]) < 14) {
  console.error('Error: Node.js version 14 or higher is required');
}

// Check AWS config exists
const awsConfigPath = path.join(__dirname, 'server', 'config', 'aws.json');
if (!fs.existsSync(awsConfigPath)) {
  console.error('Error: AWS configuration file not found');
} else {
  console.log('AWS configuration file found');
}

// Check if required directories exist
['server/uploads'].forEach(dir => {
  if (!fs.existsSync(path.join(__dirname, dir))) {
    fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
    console.log(`Created directory: ${dir}`);
  } else {
    console.log(`Directory exists: ${dir}`);
  }
});

console.log('Verification complete!');
```

## Distribution Channels

Consider these distribution channels for your application:

1. **Direct Sales Website**: Create a dedicated website for the product
2. **Dental Software Marketplaces**: List on industry-specific marketplaces
3. **Reseller Partnerships**: Partner with dental equipment suppliers
4. **Subscription Model**: Offer different subscription tiers with varying features

## Customer Support Plan

Implement a support system for your customers:

1. **Documentation**: Include comprehensive documentation
2. **Email Support**: Dedicated support email address
3. **Training Materials**: Video tutorials for common operations
4. **Remote Setup Assistance**: Offer paid remote installation services

## Updates and Maintenance

Plan for distributing updates:

1. Create a version checking mechanism within the application
2. Establish a secure download location for updates
3. Implement a notification system for critical updates
4. Document the update process in the user manual

## Next Steps for Distribution-Ready Product

To make the application fully ready for commercial distribution:

1. Implement a proper license key validation system
2. Create a professional installer package
3. Develop automated system checks for compatibility
4. Set up a customer portal for license management and support
5. Add usage analytics (with appropriate privacy controls)
6. Create marketing materials and product demonstrations 