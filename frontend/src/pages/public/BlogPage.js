import React from 'react';
import Breadcrumbs from '../../components/public/Breadcrumbs';

export default function BlogPage() {
  return (
    <div data-testid="blog-page" className="bg-black min-h-[60vh]">
      <section className="pt-12 pb-20">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-[100px]">
          <Breadcrumbs items={[{ label: 'HOME', to: '/' }, { label: 'BLOG' }]} />
          <h1 className="text-[48px] md:text-[80px] font-bold uppercase text-[#FEAE00] mt-10 leading-none">Blog</h1>
          <p className="text-[20px] text-white mt-12">Coming soon.</p>
        </div>
      </section>
    </div>
  );
}
