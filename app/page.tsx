'use client';

import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BarChart3, CheckCircle2, Clock3, Database,
  Dumbbell, ExternalLink, Info, MapPin, Navigation, ShieldCheck, Sparkles, Target,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import facilityDataset from '@/data/generated/facility-samples.json';
import fitnessDataset from '@/data/generated/fitness-guidance.json';
import regionDataset from '@/data/generated/region-insights.json';
import schoolDataset from '@/data/generated/school-facilities.json';

const areas = {
  송파구: { preferredCenter: 'KSPO송파', note: '생활권 내 체력측정·상담 거점' },
  중구: { preferredCenter: '중구(서울)', note: '충무스포츠센터 4층' },
  성동구: { preferredCenter: '성동', note: '공공복합청사 4층' },
} as const;

const ageGroupByAge = {
  '10대': '청소년', '20대': '성인', '30대': '성인', '40대': '성인',
  '50대': '성인', '60대': '성인', '70대 이상': '어르신',
} as const;

const recommendations = {
  체력회복: { title: '빠르게 걷기 + 기초 근력', subtitle: '무리 없이 다시 만드는 주 3회 루틴', intensity: '중간 강도', duration: '회당 30분', reason: '심폐지구력과 전신 근지구력을 함께 시작하기 좋은 조합입니다.', color: 'bg-[#dff4ec] text-[#146c51]' },
  근력향상: { title: '전신 근력운동', subtitle: '큰 근육을 중심으로 한 주 3회 루틴', intensity: '점진적 강도', duration: '회당 40분', reason: '상·하체 근력과 근지구력을 균형 있게 높이는 데 초점을 둡니다.', color: 'bg-[#e9e5ff] text-[#5142a8]' },
  체중관리: { title: '유산소 + 순환 근력운동', subtitle: '꾸준히 이어가기 쉬운 혼합 루틴', intensity: '중간 강도', duration: '회당 45분', reason: '유산소 활동과 근력운동을 함께 배치해 지속 가능한 활동량을 만듭니다.', color: 'bg-[#fff0d7] text-[#92510f]' },
  유연성: { title: '전신 스트레칭 + 요가', subtitle: '가동범위를 부드럽게 넓히는 루틴', intensity: '낮은 강도', duration: '회당 25분', reason: '유연성과 균형 능력을 중심으로 부담 없이 시작할 수 있습니다.', color: 'bg-[#e0efff] text-[#265f9f]' },
} as const;

const sources = [
  { name: '위치기반 체력측정 및 운동처방 정보', use: '연령대별 체력 특성·운동 정보·인증센터 위치', updated: '2026.08.19', href: 'https://www.bigdata-culture.kr/bigdata/user/data_market/detail.do?id=599b29a1-bb8d-41a5-8de5-400d2c8d2ba5' },
  { name: '전국체육시설현황 데이터', use: '시설명·주소·연락처·실내외 정보', updated: '2026.08.20', href: 'https://www.bigdata-culture.kr/bigdata/user/data_market/detail.do?id=3b5399ad-88c4-43aa-a1d7-7ef6a630370b' },
  { name: '체육생활이용정보', use: '시군구별 인구·종목 수요·시설 공급 순위', updated: '2026.08.20', href: 'https://www.bigdata-culture.kr/bigdata/user/data_market/detail.do?id=25c4e3e0-2594-11eb-af9a-4b03f0a582d6' },
  { name: '개방학교 체육시설', use: '학교명·운영시간·코트·편의시설 정보', updated: '2026.08.20', href: 'https://www.bigdata-culture.kr/bigdata/user/data_market/detail.do?id=ddd74830-f977-11eb-8e60-2bcdc8456bfb' },
];

const fitnessLevels = ['입문', '보통', '숙련'] as const;
const preferences = ['걷기·달리기', '근력운동', '구기·라켓', '유연성·균형'] as const;
const availableTimes = ['20분', '30분', '45분', '60분 이상'] as const;

function formatPhone(value?: string) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.startsWith('02') && digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  if (digits.startsWith('02') && digits.length === 10) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return value || '연락처 확인 필요';
}

export default function Home() {
  const [area, setArea] = useState<keyof typeof areas>('송파구');
  const [age, setAge] = useState('30대');
  const [goal, setGoal] = useState<keyof typeof recommendations>('체력회복');
  const [fitness, setFitness] = useState<(typeof fitnessLevels)[number]>('입문');
  const [preference, setPreference] = useState<(typeof preferences)[number]>('걷기·달리기');
  const [availableTime, setAvailableTime] = useState<(typeof availableTimes)[number]>('30분');
  const [showResult, setShowResult] = useState(true);
  const recommendation = recommendations[goal];
  const ageGroup = ageGroupByAge[age as keyof typeof ageGroupByAge] ?? '성인';
  const ageEvidence = fitnessDataset.ageGroups.find((item) => item.ageGroup === ageGroup);
  const evidenceExercises = ageEvidence?.topExercises.slice(0, 3) ?? [];
  const certCenter = fitnessDataset.centers.find((item) => item.province === '서울특별시' && item.district === area && item.name === areas[area].preferredCenter)
    ?? fitnessDataset.centers.find((item) => item.province === '서울특별시' && item.district === area);
  const summary = useMemo(() => `${age} · 서울 ${area} · ${goal}`, [age, area, goal]);
  const mapHref = `https://map.naver.com/p/search/${encodeURIComponent(certCenter?.address ?? `서울특별시 ${area}`)}`;
  const regionInsight = regionDataset.regions.find((item) => item.province === '서울특별시' && item.district === area);
  const localFacilities = facilityDataset.facilities.filter((item) => item.province === '서울특별시' && item.district === area);
  const localSchools = schoolDataset.facilities.filter((item) => item.province === '서울특별시' && item.district === area);
  const maximumFacilityCount = Math.max(...(regionInsight?.demands.map((item) => item.count) ?? [1]), 1);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-[#dce6e1] bg-[#f7faf8]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#top" className="flex items-center gap-2.5" aria-label="내곁체육 홈">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Activity className="size-5" /></span>
            <span className="text-lg font-black tracking-[-0.04em]">내곁체육</span>
            <Badge variant="outline" className="hidden border-[#b9d4c9] text-[#276b55] sm:inline-flex">공공데이터 시제품</Badge>
          </a>
          <a href="#data" className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground">데이터 근거 <Database className="size-4" /></a>
        </div>
      </header>

      <section id="top" className="mx-auto max-w-7xl px-5 pb-16 pt-8 lg:px-8 lg:pt-12">
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="size-4" /> 국민체육진흥공단 데이터로 찾는 오늘의 운동</div>
            <h1 className="text-balance text-4xl font-black leading-[1.08] tracking-[-0.055em] sm:text-5xl lg:text-6xl">나에게 맞는 운동과<br />가까운 체육시설을 한 번에</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">연령·목표·생활권을 선택하면 공공 체력정보와 시설 데이터를 연결해 실행 가능한 생활체육 경로를 보여드립니다.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#dce6e1] bg-white px-4 py-3 shadow-sm">
            <ShieldCheck className="size-5 text-primary" />
            <div><p className="text-xs font-bold text-muted-foreground">데이터 기준</p><p className="text-sm font-extrabold">2026년 8월 최신 공개본</p></div>
          </div>
        </div>

        <Tabs defaultValue="personal" className="gap-5">
          <TabsList className="h-11 rounded-xl bg-[#e9f1ed] p-1">
            <TabsTrigger value="personal" className="h-9 px-4 font-bold"><Target /> 나의 운동 찾기</TabsTrigger>
            <TabsTrigger value="region" className="h-9 px-4 font-bold"><BarChart3 /> 지역 인사이트</TabsTrigger>
            <TabsTrigger value="source" className="h-9 px-4 font-bold"><Database /> 데이터 출처</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
              <section className="rounded-3xl border border-[#dce6e1] bg-card p-5 shadow-[0_16px_50px_rgba(26,68,52,0.08)] sm:p-6">
                <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">My movement</p><h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">오늘의 조건</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">민감한 개인정보는 저장하지 않습니다.</p></div>
                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">생활권</span>
                    <Select value={area} onValueChange={(value) => setArea(value as keyof typeof areas)}>
                      <SelectTrigger className="h-11 w-full rounded-xl bg-[#f7faf8] px-3"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.keys(areas).map((name) => <SelectItem key={name} value={name}>서울 {name}</SelectItem>)}</SelectContent>
                    </Select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">연령대</span>
                    <Select value={age} onValueChange={(value) => setAge(value ?? '30대')}>
                      <SelectTrigger className="h-11 w-full rounded-xl bg-[#f7faf8] px-3"><SelectValue /></SelectTrigger>
                      <SelectContent>{['10대', '20대', '30대', '40대', '50대', '60대', '70대 이상'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                    </Select>
                  </label>
                  <fieldset>
                    <legend className="mb-2 text-sm font-bold">운동 목표</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(recommendations) as Array<keyof typeof recommendations>).map((value) => (
                        <button key={value} type="button" onClick={() => setGoal(value)} className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${goal === value ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-[#dce6e1] bg-[#f7faf8] hover:border-[#91b9a9]'}`}>{value}</button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold">현재 체력수준</span>
                      <Select value={fitness} onValueChange={(value) => setFitness((value ?? '입문') as (typeof fitnessLevels)[number])}>
                        <SelectTrigger className="h-11 w-full rounded-xl bg-[#f7faf8] px-3"><SelectValue /></SelectTrigger>
                        <SelectContent>{fitnessLevels.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold">이용 가능시간</span>
                      <Select value={availableTime} onValueChange={(value) => setAvailableTime((value ?? '30분') as (typeof availableTimes)[number])}>
                        <SelectTrigger className="h-11 w-full rounded-xl bg-[#f7faf8] px-3"><SelectValue /></SelectTrigger>
                        <SelectContent>{availableTimes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">선호 활동</span>
                    <Select value={preference} onValueChange={(value) => setPreference((value ?? '걷기·달리기') as (typeof preferences)[number])}>
                      <SelectTrigger className="h-11 w-full rounded-xl bg-[#f7faf8] px-3"><SelectValue /></SelectTrigger>
                      <SelectContent>{preferences.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                    </Select>
                  </label>
                  <Button size="lg" onClick={() => setShowResult(true)} className="h-12 w-full rounded-xl text-base font-extrabold shadow-[0_10px_24px_rgba(22,115,85,0.24)]">내 운동 경로 보기 <ArrowRight /></Button>
                </div>
              </section>

              <section aria-live="polite" className="min-w-0">
                {showResult ? <div className="grid gap-5">
                  <article className="overflow-hidden rounded-3xl bg-[#123d31] text-white shadow-[0_18px_50px_rgba(18,61,49,0.2)]">
                    <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-start">
                      <div>
                        <Badge className={`mb-5 border-0 ${recommendation.color}`}>{summary}</Badge>
                        <p className="text-sm font-bold text-[#9fd9c5]">오늘의 추천 루틴</p>
                        <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{recommendation.title}</h2>
                        <p className="mt-2 text-base text-white/70">{recommendation.subtitle}</p>
                        <p className="mt-6 max-w-xl border-l-2 border-[#55d2a6] pl-4 text-sm leading-6 text-white/80">{recommendation.reason} 현재 체력수준은 <strong>{fitness}</strong>, 선호 활동은 <strong>{preference}</strong>로 반영했습니다.</p>
                        <div className="mt-5 max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs font-bold text-[#9fd9c5]">공단 실제 처방 데이터 · {ageGroup} 상위 운동</p>
                          <div className="mt-2 flex flex-wrap gap-2">{evidenceExercises.map((item) => <span key={item.name} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{item.name} <span className="text-white/45">{item.count.toLocaleString('ko-KR')}회</span></span>)}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                        <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><Clock3 className="mb-2 size-4 text-[#83e6c1]" /><p className="text-xs text-white/55">이용 가능시간</p><p className="mt-0.5 font-extrabold">{availableTime}</p></div>
                        <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><Dumbbell className="mb-2 size-4 text-[#83e6c1]" /><p className="text-xs text-white/55">운동 강도</p><p className="mt-0.5 font-extrabold">{recommendation.intensity}</p></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 bg-black/10 px-6 py-3 text-xs text-white/60 sm:px-8">
                      <span className="flex items-center gap-1.5"><Database className="size-3.5" /> 운동처방 원본 {fitnessDataset.recordCount.toLocaleString('ko-KR')}건 집계</span>
                      <span className="flex items-center gap-1.5"><Info className="size-3.5" /> 의료 진단이 아닌 생활체육 탐색 정보</span>
                    </div>
                  </article>
                  <article className="rounded-3xl border border-[#dce6e1] bg-card p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div><div className="flex items-center gap-2 text-sm font-bold text-primary"><Navigation className="size-4" /> 추천 운동을 시작할 가까운 거점</div><h3 className="mt-2 text-2xl font-black tracking-[-0.035em]">{certCenter ? `${certCenter.name} 체력인증센터` : `${area} 체력인증센터`}</h3><p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" /> {certCenter?.address ?? `서울특별시 ${area}`}</p></div>
                      <Badge variant="secondary" className="bg-[#edf5f1] text-[#276b55]">공공 체력인증 거점</Badge>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-[#f7faf8] p-4"><p className="text-xs font-bold text-muted-foreground">시설 안내</p><p className="mt-1 text-sm font-extrabold">{areas[area].note}</p></div>
                      <div className="rounded-2xl bg-[#f7faf8] p-4"><p className="text-xs font-bold text-muted-foreground">운영·연락처</p><p className="mt-1 text-sm font-extrabold">{certCenter?.hours || '운영시간 확인 필요'} · {formatPhone(certCenter?.phone)}</p></div>
                      <div className="rounded-2xl bg-[#f7faf8] p-4"><p className="text-xs font-bold text-muted-foreground">선정 근거</p><p className="mt-1 text-sm font-extrabold">공단 원본 센터 {fitnessDataset.centerCount}곳 중 지역 매칭</p></div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce6e1] bg-[#f7faf8] p-4">
                      <p className="text-sm leading-6 text-muted-foreground"><strong className="text-foreground">추천 근거:</strong> 개인 식별자와 측정값은 제외하고, {fitnessDataset.recordsWithPrescription.toLocaleString('ko-KR')}건의 처방 보유 기록을 연령구분별로 집계했습니다. 선택 생활권은 원본 센터 주소와 매칭했습니다.</p>
                      <a href={mapHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline', className: 'rounded-xl bg-white' })}>지도에서 위치 보기 <ExternalLink /></a>
                    </div>
                  </article>
                  <article className="rounded-3xl border border-[#dce6e1] bg-card p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-primary">전국체육시설현황 실제 연결</p><h3 className="mt-1 text-xl font-black">서울 {area} 대표 체육시설</h3></div><Badge variant="outline">원본 153,514행 검증</Badge></div>
                    <div className="grid gap-3 md:grid-cols-3">{localFacilities.slice(0, 6).map((item) => <a key={`${item.name}-${item.address}`} href={`https://map.naver.com/p/search/${encodeURIComponent(item.address)}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-[#dce6e1] bg-[#f9fbfa] p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"><div className="flex items-center justify-between gap-2"><Badge variant="outline">{item.type || '체육시설'}</Badge><ExternalLink className="size-4 text-muted-foreground" /></div><p className="mt-3 font-black">{item.name}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.address}{item.phone ? <><br />{item.phone}</> : null}</p></a>)}</div>
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">지역별 시설 유형의 다양성, 좌표·연락처 보유 여부를 기준으로 최대 12개 대표시설을 추출했습니다. 지도 링크는 시설 주소를 기준으로 연결됩니다.</p>
                  </article>
                </div> : null}
              </section>
            </div>
          </TabsContent>

          <TabsContent value="region">
            <section className="rounded-3xl border border-[#dce6e1] bg-card p-6 shadow-sm sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
                <div><Badge variant="secondary" className="bg-[#e8f3ee] text-primary">체육생활이용정보 실제 연결</Badge><h2 className="mt-4 text-3xl font-black tracking-[-0.045em]">서울 {area}의 수요와 공급을<br />실제 수치로 비교</h2><p className="mt-4 max-w-lg leading-7 text-muted-foreground">2026년 6월 기준 인구·주요 수요종목별 시설 수·인당 시설 순위를 연결했습니다. 시설 수가 적고 인당 시설 순위가 낮은 종목을 확충 검토 대상으로 활용할 수 있습니다.</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f7faf8] p-4"><p className="text-xs font-bold text-muted-foreground">지역 인구</p><p className="mt-1 text-2xl font-black">{regionInsight?.population.toLocaleString('ko-KR') ?? '-'}명</p></div><div className="rounded-2xl bg-[#f7faf8] p-4"><p className="text-xs font-bold text-muted-foreground">비교 종목</p><p className="mt-1 text-2xl font-black">{regionInsight?.demands.length ?? 0}개</p></div></div><p className="mt-4 text-xs text-muted-foreground">원본 기준월 {regionDataset.sourceBaseMonth.slice(0, 4)}.{regionDataset.sourceBaseMonth.slice(4)} · 원본 154,870행 검증</p></div>
                <div className="rounded-3xl bg-[#123d31] p-6 text-white sm:p-8">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#83e6c1]">Actual data · 서울 {area}</p><h3 className="mt-2 text-xl font-black">주요 수요종목별 시설 수</h3>
                  <div className="mt-6 space-y-3">{regionInsight?.demands.map((item) => <div key={item.category}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold">{item.facility} <span className="text-white/45">· {item.category.replace('자주이용하는 ', '')}</span></span><span className="shrink-0 font-black text-[#83e6c1]">{item.count.toLocaleString('ko-KR')}개</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#55d2a6]" style={{ width: `${Math.max((item.count / maximumFacilityCount) * 100, 2)}%` }} /></div></div>)}</div>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-white/65">인당 시설 수와 전국 순위는 원본 데이터에 함께 보존되어 있으며, 후속 정책 분석 화면의 취약지역 판정 변수로 사용합니다.</div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-[#dce6e1] bg-[#f9fbfa] p-4 text-sm"><strong>개방학교 데이터 연결:</strong> 서울 {area}에서 확인된 개방학교 체육시설은 {localSchools.length}곳입니다. {localSchools.length === 0 ? '해당 원본(2017년 기준)에 등록된 시설이 없어 0으로 표시합니다.' : localSchools.slice(0, 3).map((item) => item.name).join(', ')}</div>
            </section>
          </TabsContent>

          <TabsContent value="source">
            <section id="data" className="rounded-3xl border border-[#dce6e1] bg-card p-5 shadow-sm sm:p-8">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-primary">Data transparency</p><h2 className="mt-1 text-3xl font-black tracking-[-0.045em]">추천 근거가 되는 공공데이터</h2></div><p className="text-sm text-muted-foreground">제공: 국민체육진흥공단 · 문화빅데이터 플랫폼</p></div>
              <div className="grid gap-3 md:grid-cols-2">
                {sources.map((source, index) => <a key={source.name} href={source.href} target="_blank" rel="noreferrer" className="group rounded-2xl border border-[#dce6e1] bg-[#f9fbfa] p-5 transition hover:-translate-y-0.5 hover:border-[#8db6a6] hover:shadow-md"><div className="flex items-start justify-between gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-black text-white">{index + 1}</span><ExternalLink className="size-4 text-muted-foreground transition group-hover:text-primary" /></div><h3 className="mt-4 font-black tracking-[-0.02em]">{source.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{source.use}</p><p className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#3f7563]"><CheckCircle2 className="size-3.5" /> {source.updated} 갱신 확인</p></a>)}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </section>

      <footer className="border-t border-[#dce6e1] bg-[#eef4f1]"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center lg:px-8"><div><strong className="text-foreground">내곁체육</strong> · 공공데이터 기반 생활체육 내비게이션</div><div>운영주체 공공근육(개인 참가자 정예원) · 2026 국민체육진흥공단 공공데이터 활용 경진대회 시제품</div></div></footer>
    </main>
  );
}
