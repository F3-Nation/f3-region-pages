import { Metadata } from 'next';
import { SITE_CONFIG } from '@/constants';

export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE_CONFIG.title}`,
    default: SITE_CONFIG.title,
  },
};

export default function RegionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
