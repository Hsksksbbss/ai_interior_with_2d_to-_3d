'use client';

import AuthLayout from '../../components/auth/AuthLayout';
import PasswordAuthCard from '../../components/auth/PasswordAuthCard';

export default function LoginPage() {
  return (
    <AuthLayout caption="Your plans, rooms and interactive 3D homes, right where you left them.">
      <PasswordAuthCard mode="login" />
    </AuthLayout>
  );
}
