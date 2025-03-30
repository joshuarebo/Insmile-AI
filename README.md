# Insmile AI - Dental Analysis Platform

Insmile AI is a powerful dental analysis platform that leverages AI to provide instant, accurate analysis of dental scans, generate treatment plans, and assist with patient communication.

## Features

- **Real-time Dental Scan Analysis**: Upload and analyze panoramic dental X-rays
- **AI-Powered Findings**: Detect cavities, gum disease, and other dental issues
- **Treatment Plan Generation**: Get AI-generated treatment plans based on analysis
- **Patient Dashboard**: Manage patient records and scan history
- **AI Chat Assistant**: Answer patient questions about dental health
- **Report Generation**: Create comprehensive dental reports

## Technology Stack

- **Frontend**: React, Material UI
- **Backend**: Node.js, Express
- **AI Integration**: Amazon Bedrock with Nova Pro model
- **Image Processing**: Custom algorithms for dental scan analysis

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- NPM or Yarn
- AWS account with access to Amazon Bedrock

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/insmile-ai.git
   cd insmile-ai
   ```

2. Install dependencies
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Configure AWS credentials

   Copy the example configuration file:
   ```
   cp server/config/aws.example.json server/config/aws.json
   ```

   Then edit `server/config/aws.json` with your AWS credentials:
   ```json
   {
     "region": "us-east-1",
     "credentials": {
       "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
       "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY"
     }
   }
   ```

4. Start the application
   ```
   # Start the server (from the server directory)
   npm run dev

   # Start the client (from the client directory)
   npm start
   ```

## Usage Guide

1. **Patient Management**
   - Create and manage patient profiles
   - View patient history and previous scans

2. **Scan Analysis**
   - Upload dental scans (X-rays, panoramic images)
   - Get AI-powered analysis with identified issues
   - View detailed findings with confidence scores

3. **Treatment Planning**
   - Generate AI-based treatment plans
   - Customize and adapt plans as needed
   - Explain treatments to patients with visual aids

4. **AI Assistant**
   - Chat with the AI dental assistant
   - Answer patient questions
   - Provide dental health information

## Customization

The application can be customized in several ways:

- **Branding**: Update logos and colors in the client theme
- **AI Models**: Configure different AI models in the server settings
- **Analysis Parameters**: Adjust sensitivity and detection thresholds

## Licensing

This is a commercial product. Please contact us for licensing options:

- Email: your.email@example.com
- Website: https://www.example.com

## Support

For technical support, please contact our support team:

- Technical Support: support@example.com
- Phone: +1 (123) 456-7890

## Legal Notice

Insmile AI is intended to be used as a decision support tool by dental professionals. It should not replace professional judgment or diagnosis. Always defer to your professional training and expertise when making patient care decisions. 