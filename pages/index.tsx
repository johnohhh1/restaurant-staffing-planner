import React from 'react';
import type { NextPage } from 'next';
import dynamic from 'next/dynamic';

const StaffingPlanner = dynamic(
  () => import('../components/StaffingPlanner'),
  { 
    ssr: false,
    loading: () => <div>Loading...</div>
  }
);

const Home: NextPage = () => {
  return (
    <div style={{ padding: '20px' }}>
      <StaffingPlanner />
    </div>
  );
};

export default Home;