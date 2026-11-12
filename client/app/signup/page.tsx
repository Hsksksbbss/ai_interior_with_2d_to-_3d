'use client';

import AuthLayout from '../../components/auth/AuthLayout';
import PasswordAuthCard from '../../components/auth/PasswordAuthCard';

export default function SignupPage() {
  return (
    <AuthLayout caption="From room requirements to an interactive 3D home in minutes.">
      <PasswordAuthCard mode="signup" />
    </AuthLayout>
  );
}
