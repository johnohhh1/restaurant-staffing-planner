import React from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
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
    <>
      <Head>
        <title>Woods Area Staffing Planner</title>
        <meta name="description" content="Restaurant staffing and hiring calculator" />
      </Head>
      <div style={{ padding: '20px' }}>
        <StaffingPlanner />
      </div>
    </>
  );
};

export default Home;