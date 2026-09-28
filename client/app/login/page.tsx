'use client';

import AuthLayout from '../../components/auth/AuthLayout';
import OtpAuthCard from '../../components/auth/OtpAuthCard';

export default function LoginPage() {
  return (
    <AuthLayout caption="Your plans, rooms and interactive 3D homes, right where you left them.">
      <OtpAuthCard mode="login" />
    </AuthLayout>
  );
}
