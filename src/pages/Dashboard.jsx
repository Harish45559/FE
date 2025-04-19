import React from 'react';
import DashboardLayout from '../components/DashboardLayout';

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <DashboardLayout>
      <div className="dashboard-container">
      <h1 className="dashboard-title">
  {user?.role === 'admin'
    ? 'Welcome, Admin 🎉'
    : `Welcome, ${user?.first_name} ${user?.last_name} 👋`}
</h1>

        <p className="dashboard-subtext">
          Select a menu option from the left to manage the system.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
