import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getTranslation } from '@/lib/i18n';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: getTranslation('common.error'),
        description: getTranslation('auth.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await login({ username, password });
      toast({
        title: getTranslation('common.success'),
        description: getTranslation('auth.loginSuccess'),
      });
    } catch (error: any) {
      toast({
        title: getTranslation('auth.loginFailed'),
        description: error.detail || getTranslation('auth.invalidCredentials'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{getTranslation('auth.loginTitle')}</CardTitle>
        <CardDescription>{getTranslation('auth.loginDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{getTranslation('auth.username')}</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={getTranslation('auth.enterUsername')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{getTranslation('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={getTranslation('auth.enterPassword')}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? getTranslation('auth.loggingIn') : getTranslation('auth.login')}
          </Button>
          {onSwitchToRegister && (
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={onSwitchToRegister}
                className="text-sm"
              >
                {getTranslation('auth.noAccount')}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
