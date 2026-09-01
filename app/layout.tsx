import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://naegyeot-sports.yewonjeong000.chatgpt.site'),
  title: '내곁체육 | 공공데이터 기반 생활체육 내비게이션',
  description: '나에게 맞는 운동과 가까운 체육시설을 공공데이터로 연결합니다.',
  openGraph: {
    title: '내곁체육 | 공공데이터 기반 생활체육 내비게이션',
    description: '나에게 맞는 운동과 가까운 체육시설을 국민체육진흥공단 공공데이터로 연결합니다.',
    type: 'website',
    locale: 'ko_KR',
    images: [{ url: '/og.png', width: 1728, height: 910, alt: '내곁체육 서비스 소개 이미지' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '내곁체육',
    description: '공공데이터 기반 생활체육 내비게이션',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
