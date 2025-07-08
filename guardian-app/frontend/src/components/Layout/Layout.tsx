import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="phone-frame mx-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout; 