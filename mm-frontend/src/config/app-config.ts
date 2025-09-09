// Application Configuration
export interface AppConfig {
  apiBaseUrl: string;
  groupId: string;
  environment: 'development' | 'staging' | 'production';
}

// Default configuration
const defaultConfig: AppConfig = {
  apiBaseUrl: 'http://127.0.0.1:8000',
  groupId: '2847737995453663',
  environment: 'development'
};

// Get configuration from environment variables or use defaults
export const getAppConfig = (): AppConfig => {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || defaultConfig.apiBaseUrl,
    groupId: import.meta.env.VITE_GROUP_ID || defaultConfig.groupId,
    environment: (import.meta.env.MODE as 'development' | 'staging' | 'production') || defaultConfig.environment
  };
};

// Export the configuration
export const appConfig = getAppConfig();
