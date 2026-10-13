import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, it, expect } from 'vitest';
import { VerificationRequest } from './VerificationRequest';
afterEach(cleanup);
it('does not offer an unsupported selfie upload', () => {
  const view = render(<VerificationRequest verificationStatus="none" />);
  expect(screen.getByText(/Selfie ile doğrulama henüz/)).toBeInTheDocument();
  expect(view.container.querySelector('input[type=file]')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});
it('preserves existing pending status without an invented processing deadline', () => {
  render(<VerificationRequest verificationStatus="pending" />);
  expect(screen.getByText('Başvurun bekliyor')).toBeInTheDocument();
  expect(screen.queryByText(/24 saat/)).toBeNull();
});
