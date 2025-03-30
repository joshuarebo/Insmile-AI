# Insmile AI - Setup Instructions

Thank you for purchasing Insmile AI! This document will guide you through setting up the application for your dental practice.

## System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 1GB for the application, plus additional space for patient data
- **Node.js**: Version 14.x or higher
- **Internet Connection**: Required for AWS services

## Installation Steps

### 1. Extract the Software Package

Unzip the Insmile AI package to your desired location.

### 2. Set Up AWS Credentials

This application uses AWS Bedrock services for AI analysis. You'll need an AWS account with access to Bedrock services:

1. Sign up for an AWS account if you don't already have one
2. Create an IAM user with programmatic access
3. Attach the `AmazonBedrockFullAccess` policy to this user
4. Copy the access key ID and secret access key

Then:

1. Navigate to the `server/config` directory
2. Copy `aws.example.json` to `aws.json`
3. Edit `aws.json` with your AWS credentials:
   ```json
   {
     "region": "us-east-1",
     "credentials": {
       "accessKeyId": "YOUR_ACCESS_KEY_ID",
       "secretAccessKey": "YOUR_SECRET_ACCESS_KEY"
     }
   }
   ```

### 3. Install Dependencies

Open a terminal/command prompt and navigate to the project root directory:

```bash
# Install all dependencies
npm run install:all
```

### 4. Configure the Application (Optional)

You can customize various aspects of the application:

1. Edit `server/src/config/app.config.js` to modify server settings
2. Edit `client/src/config/config.js` to modify client settings
3. Replace logo images in `client/public` with your practice's logo

### 5. Start the Application

From the project root directory:

```bash
# Start both client and server
npm start
```

The application will be available at http://localhost:3000

## First-Time Setup

1. Create an administrator account when prompted on first launch
2. Log in with your administrator credentials
3. Set up your practice details in the Settings page
4. Create user accounts for your staff members
5. Begin adding patients and uploading scans

## Usage Tips

- **Scan Quality**: For best results, upload high-resolution dental X-rays
- **Patient Data**: Complete patient profiles with detailed medical history improve AI analysis
- **Backup**: Regularly backup your `server/uploads` directory to preserve patient scans
- **Internet Connection**: Ensure stable internet connectivity for real-time AI analysis

## Troubleshooting

**Q: The AI analysis is not working**
A: Check your AWS credentials and ensure your AWS account has access to the Bedrock services.

**Q: The application is slow**
A: Check your system resources, close unnecessary applications, and ensure you have a stable internet connection.

**Q: Images aren't uploading properly**
A: Ensure the images are in JPEG, PNG, or DICOM format and under 10MB in size.

## Support and Updates

For technical support, please contact:
- Email: support@example.com
- Phone: +1 (123) 456-7890

Updates will be provided via your registered email address. Please ensure your email is current to receive important updates and security patches.

## Security Best Practices

1. Always use strong passwords for your AWS account and application login
2. Change your password regularly
3. Do not share your AWS credentials
4. Ensure your server is properly secured if exposed to the internet
5. Use HTTPS if deploying to a production environment

---

Thank you for choosing Insmile AI for your dental practice! 