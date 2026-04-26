import React from 'react';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import ConsultationCTAForm from '../../components/public/ConsultationCTAForm';

const teamImg = 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=70';
const ceoImg = 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=70';

export default function AboutPage() {
  return (
    <div data-testid="about-page" className="bg-black">
      <section className="pt-12 pb-20">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-[100px]">
          <Breadcrumbs items={[{ label: 'HOME', to: '/' }, { label: 'ABOUT US' }]} />
          <h1 className="text-[36px] md:text-[48px] font-bold text-white uppercase mt-8">About us</h1>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 mt-16 items-start">
            <h2 className="text-[40px] md:text-[72px] font-bold text-[#FEAE00] leading-[1.05]">We are your reliable partner in the world of cars.</h2>
            <p className="text-[20px] md:text-[24px] text-white leading-relaxed">
              Our company specializes in selling cars from the USA, Europe and Korea at the best prices on the market.
            </p>
          </div>

          <p className="text-[20px] md:text-[24px] text-white leading-relaxed max-w-5xl mt-16">
            We combine competitive pricing with a high level of service so that you get not just a car, but confidence in your choice. We'll help you find the perfect option that fully matches your expectations, lifestyle, and budget.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-20">
            <img src={teamImg} alt="Team" className="w-full h-[360px] md:h-[460px] object-cover rounded" loading="lazy" />
            <img src={ceoImg} alt="CEO" className="w-full h-[360px] md:h-[460px] object-cover rounded md:mt-20" loading="lazy" />
          </div>

          <h3 className="text-[40px] md:text-[56px] font-bold uppercase text-white mt-24">Services</h3>
          <div className="mt-12 space-y-12">
            <div className="text-[28px] md:text-[40px] font-bold text-[#FEAE00] leading-tight">Car delivery on order<br />from the USA / Europe / Korea</div>
            <div className="text-[28px] md:text-[40px] font-bold text-[#FEAE00] leading-tight">Sale of available cars<br />from the USA / Europe / Korea</div>
            <div className="text-[28px] md:text-[40px] font-bold text-[#FEAE00] leading-tight">Leasing</div>
          </div>
        </div>
      </section>
      <ConsultationCTAForm />
    </div>
  );
}
