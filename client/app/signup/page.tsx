'use client';

import AuthLayout from '../../components/auth/AuthLayout';
import OtpAuthCard from '../../components/auth/OtpAuthCard';

export default function SignupPage() {
  return (
    <AuthLayout caption="From room requirements to an interactive 3D home in minutes.">
      <OtpAuthCard mode="signup" />
    </AuthLayout>
  );
}
