import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getTranslation } from '@/lib/i18n';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword) {
      toast({
        title: getTranslation('common.error'),
        description: getTranslation('auth.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: getTranslation('common.error'),
        description: getTranslation('auth.passwordsNotMatch'),
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: getTranslation('common.error'),
        description: getTranslation('validation.minLength', { min: 6 }),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await register({ username, password, role: 'user' });
      toast({
        title: getTranslation('common.success'),
        description: getTranslation('auth.registerSuccess'),
      });
      if (onSwitchToLogin) {
        onSwitchToLogin();
      }
    } catch (error: any) {
      toast({
        title: getTranslation('auth.registerFailed'),
        description: error.detail || getTranslation('auth.registerFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{getTranslation('auth.registerTitle')}</CardTitle>
        <CardDescription>{getTranslation('auth.registerDescription')}</CardDescription>
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{getTranslation('auth.confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={getTranslation('auth.enterConfirmPassword')}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? getTranslation('auth.registering') : getTranslation('auth.register')}
          </Button>
          {onSwitchToLogin && (
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={onSwitchToLogin}
                className="text-sm"
              >
                {getTranslation('auth.haveAccount')}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
