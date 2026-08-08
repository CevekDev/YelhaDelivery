import type { Metadata } from 'next';
import { ResetClient } from './reset-client';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ResetClient />;
}
