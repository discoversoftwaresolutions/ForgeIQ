import React from 'react';
import { createRoot } from 'react-dom/client';
import ForgeIQDemo from './ForgeIQDemo.jsx';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<ForgeIQDemo />);
