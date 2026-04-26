import React from 'react';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import ConsultationCTAForm from '../../components/public/ConsultationCTAForm';
import { Instagram, Facebook, Send, MapPin, Phone } from 'lucide-react';

export default function ContactsPage() {
  return (
    <div data-testid="contacts-page" className="bg-black">
      <section className="pt-12 pb-20">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-[100px]">
          <Breadcrumbs items={[{ label: 'HOME', to: '/' }, { label: 'CONTACTS' }]} />
          <h1 className="text-[48px] md:text-[80px] font-bold uppercase text-[#FEAE00] mt-10 leading-none">Contacts</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-16">
            {[
              { title: 'Sofia — Dragalevtsi', address: 'Bulgaria, Sofia, Dragalevtsi, Vitosha Blvd. No. 230' },
              { title: 'Sofia — Bulgaria Blvd.', address: 'Bulgaria, Sofia, Bulgaria Blvd., No. 81' },
            ].map((o) => (
              <div key={o.title} className="bg-[#1D1D1B] rounded-lg p-10">
                <div className="text-[28px] font-bold text-white mb-4">{o.title}</div>
                <div className="flex items-start gap-3 text-[20px] text-[#FEAE00] mb-6"><MapPin size={22} className="mt-1 flex-shrink-0" /> <span>{o.address}</span></div>
                <div className="flex items-center gap-3 text-[24px] font-bold text-[#FEAE00]"><Phone size={22} /> +359 875 313 158</div>
                <div className="flex items-center gap-3 text-[24px] font-bold text-[#FEAE00] mt-2"><Phone size={22} /> +359 897 884 804</div>
              </div>
            ))}
          </div>

          <div className="mt-20">
            <div className="text-[16px] text-white mb-6">Social media:</div>
            <div className="flex items-center gap-6">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-[#FEAE00]" aria-label="Instagram"><Instagram size={40} /></a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-[#FEAE00]" aria-label="Facebook"><Facebook size={40} /></a>
              <a href="https://t.me/" target="_blank" rel="noreferrer" className="text-[#FEAE00]" aria-label="Telegram"><Send size={40} /></a>
            </div>
          </div>
        </div>
      </section>
      <ConsultationCTAForm />
    </div>
  );
}
