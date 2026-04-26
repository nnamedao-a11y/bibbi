import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import CarCardVertical from '../../components/public/CarCardVertical';
import DealsFilterBar from '../../components/public/DealsFilterBar';
import CalculateYourselfBlock from '../../components/public/CalculateYourselfBlock';
import HowWeWorkBlock from '../../components/public/HowWeWorkBlock';
import HowToBuyTurnkeyBlock from '../../components/public/HowToBuyTurnkeyBlock';
import CarAdvantagesBlock from '../../components/public/CarAdvantagesBlock';
import BeforeAfterBlock from '../../components/public/BeforeAfterBlock';
import OurClientsSayBlock from '../../components/public/OurClientsSayBlock';
import DreamCarCTABlock from '../../components/public/DreamCarCTABlock';
import FAQBlock from '../../components/public/FAQBlock';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Hero image: silver BMW M4 Coupe at sunset — premium performance aesthetic
const heroBg =
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=2400&q=80';

const YEAR_OPTIONS = (() => {
  const list = [];
  for (let y = 2026; y >= 1990; y -= 1) list.push(y);
  return list;
})();

const BRAND_OPTIONS = ['Audi', 'BMW', 'Mercedes-Benz', 'Porsche', 'Tesla', 'Lucid Motors', 'Toyota', 'Honda', 'Kia', 'Hyundai', 'Ford', 'Chevrolet', 'Lexus', 'Volkswagen'];

const HeroSelect = ({ value, onChange, options, placeholder, testId }) => (
  <div className="relative flex-1 min-w-[140px]">
    <select
      value={value}
      onChange={onChange}
      data-testid={testId}
      className="w-full h-[54px] bg-transparent border-0 px-5 pr-10 text-[14px] text-white appearance-none focus:outline-none cursor-pointer"
    >
      <option value="" className="bg-[#1D1D1B] text-white">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o} className="bg-[#1D1D1B] text-white">{o}</option>
      ))}
    </select>
    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#949494] pointer-events-none" />
  </div>
);

const POPULAR_BRANDS = [
  { name: 'Audi', slug: 'audi', query: 'Audi' },
  { name: 'BMW', slug: 'bmw', query: 'BMW' },
  { name: 'Toyota', slug: 'toyota', query: 'Toyota' },
  { name: 'Volkswagen', slug: 'volkswagen', query: 'Volkswagen' },
  { name: 'Hyundai', slug: 'hyundai', query: 'Hyundai' },
];

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [dealsType, setDealsType] = useState('car');
  const [dealsPrice, setDealsPrice] = useState('10-15');
  const [totalDeals, setTotalDeals] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/api/vehicles?limit=6`).then((r) => {
      setItems(r.data?.items || []);
      setTotalDeals(r.data?.total || 0);
    }).catch(() => { setItems([]); setTotalDeals(0); });
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (brand) qs.set('make', brand);
    if (model) qs.set('model', model);
    if (year) qs.set('year', year);
    navigate(`/catalog${qs.toString() ? `?${qs.toString()}` : ''}`);
  };

  return (
    <div className="text-white" data-testid="home-page">
      {/* ---------- HERO ---------- */}
      <section className="relative bg-black overflow-hidden" data-testid="hero-section">
        {/* Full-bleed hero image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
          aria-hidden="true"
        />
        {/* Darken left half for text readability (matches Figma split) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/0" aria-hidden="true" />

        <div className="relative max-w-[1920px] mx-auto px-6 lg:px-[100px] pt-14 pb-10" style={{ minHeight: 720 }}>
          {/* Region tag */}
          <div className="text-[14px] md:text-[16px] tracking-[0.16em] uppercase text-white mb-8" data-testid="hero-region-tag">
            USA <span className="mx-2 text-white/50">|</span> EUROPE <span className="mx-2 text-white/50">|</span> KOREA
          </div>

          {/* Constrained headline on left half */}
          <h1
            className="font-bold uppercase leading-[1.0] tracking-[-0.01em]"
            style={{ fontSize: 'clamp(38px, 4.6vw, 72px)', maxWidth: '680px' }}
            data-testid="hero-title"
          >
            <span className="block text-[#FEAE00]">From Auction</span>
            <span className="block text-white">To Keys</span>
            <span className="block text-white">In Your Hands</span>
          </h1>

          {/* Stats row */}
          <div className="mt-14 flex flex-wrap items-center gap-8 md:gap-14 text-[14px] md:text-[16px] text-white" data-testid="hero-stats">
            <span>/ Over 5,000 cars</span>
            <span>/ Real-time bids</span>
            <span>/ 500+ happy clients</span>
          </div>

          {/* Search form — centered lower on hero */}
          <form
            onSubmit={submitSearch}
            className="mt-20 md:mt-28 mx-auto max-w-[820px] flex flex-col md:flex-row items-stretch border border-[#FEAE00] rounded-md overflow-hidden bg-black/20 backdrop-blur-[2px]"
            data-testid="hero-search-form"
          >
            <div className="flex-1 md:border-r md:border-[#FEAE00]">
              <HeroSelect value={brand} onChange={(e) => setBrand(e.target.value)} options={BRAND_OPTIONS} placeholder="Brand" testId="hero-brand" />
            </div>
            <div className="flex-1 md:border-r md:border-[#FEAE00]">
              <HeroSelect value={model} onChange={(e) => setModel(e.target.value)} options={model ? [model] : []} placeholder="Model" testId="hero-model" />
            </div>
            <div className="flex-1 md:border-r md:border-[#FEAE00]">
              <HeroSelect value={year} onChange={(e) => setYear(e.target.value)} options={YEAR_OPTIONS.map(String)} placeholder="Any Year" testId="hero-year" />
            </div>
            <button
              type="submit"
              className="bg-[#FEAE00] hover:bg-[#FFBF2D] active:bg-[#E89D00] text-black font-medium uppercase text-[14px] tracking-[0.02em] px-10 md:px-14 h-[54px] transition-colors"
              data-testid="hero-search-submit"
            >
              FIND
            </button>
          </form>
        </div>
      </section>

      {/* ---------- SEARCH FOR CARS intro heading ---------- */}
      <section className="bg-black pt-24 pb-14 md:pt-32 md:pb-16 text-center" data-testid="search-intro">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-[100px]">
          <h2 className="font-bold uppercase tracking-[-0.01em] leading-[1.1]" style={{ fontSize: 'clamp(34px, 4.4vw, 68px)' }}>
            <span className="block text-[#FEAE00]">Search for cars</span>
            <span className="block text-white">From America, Europe and Korea</span>
          </h2>
        </div>
      </section>

      {/* ---------- MOST POPULAR BRANDS ---------- */}
      <section className="bg-black pb-16 md:pb-24" data-testid="popular-brands-section">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-[100px]">
          <div className="bg-black border border-[#222] rounded-md py-10 md:py-14 px-6 md:px-10">
            <h3 className="text-center text-[14px] md:text-[16px] font-semibold uppercase tracking-[0.18em] text-white mb-10">Most Popular Brands</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 items-center">
              {POPULAR_BRANDS.map((b, i) => (
                <Link
                  key={b.name}
                  to={`/catalog?make=${encodeURIComponent(b.query)}`}
                  className={`flex items-center justify-center px-6 h-[130px] md:h-[150px] hover:opacity-80 transition-opacity ${
                    i < POPULAR_BRANDS.length - 1 ? 'md:border-r md:border-[#FEAE00]/40' : ''
                  }`}
                  data-testid={`brand-${b.name.toLowerCase()}`}
                  aria-label={b.name}
                >
                  <img
                    src={`https://cdn.simpleicons.org/${b.slug}/ffffff`}
                    alt={b.name}
                    className="max-h-[70px] md:max-h-[84px] w-auto object-contain"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.outerHTML = `<span class="text-[22px] font-bold text-white uppercase tracking-wide">${b.name}</span>`;
                    }}
                  />
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/catalog" className="text-[14px] md:text-[15px] uppercase underline text-[#FEAE00] hover:brightness-110 tracking-wide" data-testid="other-brands-link">Other Brands +</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TOP VEHICLES DEALS ---------- */}
      <section className="bg-black pb-24" data-testid="top-deals-section">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-[100px]">
          {/* Heading row: centered big title + right-side tagline */}
          <div className="relative flex flex-col items-center mb-14">
            <h2 className="font-bold uppercase text-center leading-[1.05]" style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>
              <span className="block text-[#FEAE00]">Top Vehicles Deals</span>
              <span className="block text-white">Of The Week</span>
            </h2>
            <div className="lg:absolute lg:right-0 lg:top-6 flex items-stretch gap-3 mt-8 lg:mt-0 max-w-[380px]">
              <span className="text-[#FEAE00] text-[28px] leading-none font-light select-none">[</span>
              <p className="text-[13px] md:text-[14px] uppercase tracking-[0.05em] text-[#FEAE00] leading-snug">
                Thousands of listings.<br />
                Only the best make the cut.<br />
                Updated weekly.
              </p>
              <span className="text-[#FEAE00] text-[28px] leading-none font-light select-none">]</span>
            </div>
          </div>

          {/* Filter bar */}
          <DealsFilterBar
            type={dealsType}
            setType={setDealsType}
            price={dealsPrice}
            setPrice={setDealsPrice}
            proposals={totalDeals || 45}
          />

          {/* 3x2 grid of cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {items.length === 0 && (
              <div className="col-span-full text-[#5E5E5E] text-center py-20">Loading deals…</div>
            )}
            {items.map((v, i) => (
              <CarCardVertical key={v.vin || i} v={v} idx={i} />
            ))}
          </div>

          {/* More vehicles link */}
          <div className="text-center mt-16">
            <Link
              to="/catalog"
              className="text-[14px] md:text-[15px] uppercase underline text-[#FEAE00] hover:brightness-110 tracking-wide"
              data-testid="home-more-vehicles"
            >
              More Vehicles +
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- CALCULATE A CAR YOURSELF ---------- */}
      <CalculateYourselfBlock />

      {/* ---------- HOW WE WORK ---------- */}
      <HowWeWorkBlock />

      {/* ---------- HOW TO BUY A TURNKEY CAR ---------- */}
      <HowToBuyTurnkeyBlock />

      {/* ---------- CAR ADVANTAGES ---------- */}
      <CarAdvantagesBlock />

      {/* ---------- BEFORE AND AFTER ---------- */}
      <BeforeAfterBlock />

      {/* ---------- OUR CLIENTS SAY ---------- */}
      <OurClientsSayBlock />

      {/* ---------- DREAM CAR CTA ---------- */}
      <DreamCarCTABlock />

      {/* ---------- FAQ ---------- */}
      <FAQBlock />
    </div>
  );
}
