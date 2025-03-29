import AWS from 'aws-sdk';

// Configure AWS with credentials from environment variables
const configureAWS = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not found in environment variables');
  }

  AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region
  });
};

/**
 * Retrieves a secret from AWS Secrets Manager
 * @param secretName - The name/identifier of the secret to retrieve
 * @returns The parsed secret value
 * @throws Error if secret retrieval fails
 */
export const getSecret = async (secretName: string): Promise<any> => {
  try {
    configureAWS();
    const secretsManager = new AWS.SecretsManager();
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    
    if ('SecretString' in data) {
      return JSON.parse(data.SecretString);
    }
    throw new Error('Secret value is not in string format');
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
};

/**
 * Stores or updates a secret in AWS Secrets Manager
 * @param secretName - The name/identifier of the secret
 * @param secretValue - The value to store
 * @returns The result of the create/update operation
 * @throws Error if secret storage fails
 */
export const storeSecret = async (secretName: string, secretValue: any): Promise<any> => {
  try {
    configureAWS();
    const secretsManager = new AWS.SecretsManager();
    
    try {
      // Check if secret already exists
      await secretsManager.getSecretValue({ SecretId: secretName }).promise();
      
      // Update existing secret
      return await secretsManager.updateSecret({
        SecretId: secretName,
        SecretString: JSON.stringify(secretValue)
      }).promise();
    } catch (error) {
      // If secret doesn't exist, create a new one
      if ((error as AWS.AWSError).code === 'ResourceNotFoundException') {
        return await secretsManager.createSecret({
          Name: secretName,
          SecretString: JSON.stringify(secretValue)
        }).promise();
      }
      throw error;
    }
  } catch (error) {
    console.error('Error storing secret:', error);
    throw error;
  }
}; 