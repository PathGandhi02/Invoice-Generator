import React from 'react';
import { Palette } from 'lucide-react';

export default function AccentStylingSection({ activeColor, setActiveColor }) {
  const colorOptions = [
    { name: 'Default Gray', value: '#f3f4f6' },
    { name: 'Soft Blue', value: '#eff6ff' },
    { name: 'Mint Green', value: '#ecfdf5' },
    { name: 'Warm Amber', value: '#fffbeb' },
    { name: 'Lilac Purple', value: '#f5f3ff' },
    { name: 'Sunset Rose', value: '#fff1f2' }
  ];

  return (
    <div className="dash-card">
      <div className="card-title">
        <Palette size={18} />
        <span>Invoice Accent Styling</span>
      </div>
      <div className="color-swatch-group">
        {colorOptions.map((c) => (
          <div 
            key={c.value}
            className={`color-swatch ${activeColor === c.value ? 'active' : ''}`}
            style={{ backgroundColor: c.value === '#f3f4f6' ? '#d1d5db' : c.value }}
            title={c.name}
            onClick={() => setActiveColor(c.value)}
          />
        ))}
      </div>
    </div>
  );
}
